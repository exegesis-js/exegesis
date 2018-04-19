import {isSpecificationExtension} from '../oasUtils';
import Oas3Context from '../Oas3Context';
import Path from '../Path';
import PathResolver from './PathResolver';
import { ParametersMap } from '../../types/ApiInterface';

export default class Paths {
    private readonly _pathResolver : PathResolver<Path> = new PathResolver();

    constructor(context: Oas3Context) {
        const {openApiDoc} = context;

        for(const path of Object.keys(openApiDoc.paths)) {
            const pathObject = new Path(context.childContext(path), openApiDoc.paths[path]);

            if(isSpecificationExtension(path)) {
                // Skip extentions
                continue;
            }

            this._pathResolver.registerPath(path, pathObject);
        }

    }

    /**
     * Given a `pathname` from a URL (e.g. "/foo/bar") this will return the
     * PathObject from the OpenAPI document's `paths` section.
     *
     * @param urlPathname - The pathname to search for.  Note that any
     *   URL prefix defined by the `servers` section of the OpenAPI doc needs
     *   to be stripped before calling this.
     * @returns A `{pathObject, pathParams}` object.
     *   `pathParams` will be an object where keys are parameter names from path
     *   templating.  If the path cannot be resolved, returns null, although
     *   note that if the path is resolved and the operation is not found, this
     *   will return an object with a null `operationObject`.
     */
    resolvePath(
        urlPathname: string
    ) : {path: Path, rawPathParams: ParametersMap<string | string[]> | undefined} | undefined {
        const result = this._pathResolver.resolvePath(urlPathname);
        if(result) {
            return {
                path: result.value,
                rawPathParams: result.rawPathParams
            };
        } else {
            return undefined;
        }
    }
}
