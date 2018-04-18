import ld from 'lodash';

import { CustomFormats, BodyParser } from "./types/common";
import { MimeTypeRegistry } from "./utils/mime";

/**
 * Options that control how an OpenAPI document is parsed and validated.
 *
 * @property customFormats - A hash where keys are format names.  Values
 * can be one of:
 *   * A RegExp for checking a string.
 *   * A `function(string) : boolean` for checking a string, which returns
 *     false the the string is invalid.
 *   * A `{validate, type}` object, where `type` is either "string" or "number",
 *     and validate is a `function(string) : boolean`.
 *
 * @property bodyParsers - A hash where keys are either mime types or
 *   mimetype wildcards (e.g. 'application/*'), and values are
 *  `{parseString(string)}` or `(parseString(string), parseStream(readable)}`
 *  objects.
 *
 * @property maxParameters - The maximum number of properties to parse from
 *   a query string or parameter.  Defaults to 1000.
 *
 * @property defaultMaxBodySize - If a bodyParser does not support
 *   `parseStream()`, this defines the maximum size of a body that will be
 *   parsed by (most) built-in body parsers.  Note that some body parsers
 *   may ignore this value, or pass a stream object directly as the body.
 *
 * @property ignoreServers - If true, when resolving a path Exegesis will
 *   ignore the "servers" section of the OpenAPI doc entirely.
 */
export interface ExegesisOptions {
    customFormats?: CustomFormats;
    bodyParsers?: {[mimeType: string]: BodyParser};
    maxParameters?: number;
    defaultMaxBodySize?: number;
    ignoreServers?: boolean;
}

export interface ExgesisCompiledOptions {
    customFormats: CustomFormats;
    bodyParsers: MimeTypeRegistry<BodyParser>;
    parameterParsers: MimeTypeRegistry<BodyParser>;
    maxParameters: number;
    defaultMaxBodySize: number;
    ignoreServers: boolean;
}

const INT_32_MAX = 2**32;
 // Actually 18446744073709551616-1, but Javascript doesn't handle integers this large.
const INT_64_MAX = 18446744073709556000;

const defaultValidators : CustomFormats = {
    // string:date is taken care of for us:
    // https://github.com/epoberezkin/ajv/blob/797dfc8c2b0f51aaa405342916cccb5962dd5f21/lib/compile/formats.js#L34
    // string:date-time is from https://tools.ietf.org/html/draft-wright-json-schema-validation-00#section-7.3.1.
    int32: {
        type: 'number',
        validate: (value: number) => value >= 0 && value <= INT_32_MAX
    },
    int64: {
        type: 'number',
        validate: (value: number) => value >= 0 && value <= INT_64_MAX
    },
    double: {
        type: 'number',
        validate: () => true
    },
    password: () => true, // Nothing to do - this is just a hint for docs.
    // Binary and byte could both be expensive to validate, so we just do nothing.
    binary: () => true,
    byte: () => true,
    // Not defined by OAS 3.0.1, but it's used throughout OAS 3.0.1, so we put it
    // here as an alias for 'byte' just in case.
    base64: () => true
};

export function compileOptions(options: ExegesisOptions = {}) : ExgesisCompiledOptions {

    const bodyParsers = options.bodyParsers || {};

    return {
        customFormats: Object.assign({}, defaultValidators, options.customFormats || {}),
        // TODO: Allow express middlewares as body parsers?
        bodyParsers: new MimeTypeRegistry<BodyParser>(bodyParsers),
        parameterParsers: new MimeTypeRegistry<BodyParser>(ld.pickBy(bodyParsers, p => !!p.parseString)),
        // TODO: Use these.
        maxParameters: options.maxParameters || 10000,
        defaultMaxBodySize: 100000,
        ignoreServers: options.ignoreServers || false
    };
}
