import { escapeRegExp } from 'lodash';
const TEMPLATE_RE = /^(.*?){(.*?)}(.*)$/;

import { ParametersMap } from '../../types';

export type PathParserFunction = (
    pathname: string
) => { matched: string; rawPathParams: ParametersMap<any> } | null;

/**
 * @param path - The path to check.
 * @returns true if the specified path uses templating, false otherwise.
 */
export function hasTemplates(path: string): boolean {
    return !!TEMPLATE_RE.exec(path);
}

/**
 * Given a path containing template parts (e.g. "/foo/{bar}/baz"), returns
 * a regular expression that matches the path, and a list of parameters found.
 *
 * @param path - The path to convert.
 * @param options.openEnded - If true, then the returned `regex` will
 *   accept extra input at the end of the path.
 *
 * @returns A `{regex, params, parser}`, where:
 * - `params` is a list of parameters found in the path.
 * - `regex` is a regular expression that will match the path.  When calling
 *   `match = regex.exec(str)`, each parameter in `params[i]` will be present
 *   in `match[i+1]`.
 * - `parser` is a `fn(str)` that, given a path, will return null if
 *   the string does not match, and a `{matched, pathParams}` object if the
 *   path matches.  `pathParams` is an object where keys are parameter names
 *   and values are strings from the `path`.  `matched` is full string matched
 *   by the regex.
 */
export function compileTemplatePath(
    path: string,
    options: {
        openEnded?: boolean;
    } = {}
): {
    params: string[];
    regex: RegExp;
    parser: PathParserFunction;
} {
    const params: string[] = [];

    // Split up the path at each parameter.
    const regexParts: string[] = [];
    let remainingPath = path;
    let tempateMatch;
    do {
        tempateMatch = TEMPLATE_RE.exec(remainingPath);
        if (tempateMatch) {
            regexParts.push(tempateMatch[1]);
            params.push(tempateMatch[2]);
            remainingPath = tempateMatch[3];
        }
    } while (tempateMatch);
    regexParts.push(remainingPath);

    const regexStr = regexParts.map(escapeRegExp).join('([^/]*)');
    const regex = options.openEnded ? new RegExp(`^${regexStr}`) : new RegExp(`^${regexStr}$`);

    const parser = (urlPathname: string) => {
        const match = regex.exec(urlPathname);
        if (match) {
            return {
                matched: match[0],
                rawPathParams: params.reduce(
                    (result: ParametersMap<string | string[]>, paramName, index) => {
                        result[paramName] = match[index + 1];
                        return result;
                    },
                    {}
                ),
            };
        } else {
            return null;
        }
    };

    return { regex, params, parser };
}

export default class PathResolver<T> {
    // Static paths with no templating are stored in a hash, for easy lookup.
    private readonly _staticPaths: { [key: string]: T };

    // Paths with templates are stored in an array, with parser functions that
    // recognize the path.
    private readonly _dynamicPaths: {
        parser: PathParserFunction;
        value: T;
        path: string;
    }[];

    // TODO: Pass in variable styles.  Some variable styles start with a special
    // character, and we can check to see if the character is there or not.
    // (Or, replace this whole class with a uri-template engine.)
    constructor() {
        this._staticPaths = Object.create(null);
        this._dynamicPaths = [];
    }

    registerPath(path: string, value: T) {
        if (!path.startsWith('/')) {
            throw new Error(`Invalid path "${path}"`);
        }

        if (hasTemplates(path)) {
            const { parser } = compileTemplatePath(path);
            this._dynamicPaths.push({ value, parser, path });
        } else {
            this._staticPaths[path] = value;
        }
    }

    /**
     * Given a `pathname` from a URL (e.g. "/foo/bar") this will return the
     * a static path if one exists, otherwise a path with templates if one
     * exists.
     *
     * @param urlPathname - The pathname to search for.
     * @returns A `{value, rawPathParams} object if a path is matched, or
     *   undefined if there was no match.
     */
    resolvePath(urlPathname: string) {
        let value: T | undefined = this._staticPaths[urlPathname];
        let rawPathParams: ParametersMap<string | string[]> | undefined;
        let path = urlPathname;

        if (!value) {
            for (const dynamicPath of this._dynamicPaths) {
                const matched = dynamicPath.parser(urlPathname);
                if (matched) {
                    value = dynamicPath.value;
                    rawPathParams = matched.rawPathParams;
                    path = dynamicPath.path;
                }
            }
        }

        if (value) {
            return {
                value,
                rawPathParams,
                path,
            };
        } else {
            return undefined;
        }
    }
}
