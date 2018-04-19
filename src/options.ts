import ld from 'lodash';

import { MimeTypeRegistry } from "./utils/mime";
import { MimeTypeParser, StringParser, BodyParser } from './bodyParsers/BodyParser';
import TextBodyParser from './bodyParsers/TextBodyParser';
import JsonBodyParser from './bodyParsers/JsonBodyParser';

/**
 * A function which validates custom formats.
 */
export type CustomFormatChecker =  RegExp | ((value: string) => boolean);

export interface StringCustomFormatChecker {
    type: 'string';
    validate: CustomFormatChecker;
}

export interface NumberCustomFormatChecker {
    type: 'number';
    validate: (value: number) => boolean;
}

/**
 * A hash where keys are format names.  Values can be one of:
 *
 *   * A RegExp for checking a string.
 *   * A `function(string) : boolean` for checking a string, which returns
 *     false the the string is invalid.
 *   * A `{validate, type}` object, where `type` is either "string" or "number",
 *     and validate is a `function(string) : boolean`.
 */
export interface CustomFormats {
    [key: string]: CustomFormatChecker | StringCustomFormatChecker | NumberCustomFormatChecker;
}

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
    mimeTypeParsers?: {[mimeType: string]: MimeTypeParser};
    maxParameters?: number;
    defaultMaxBodySize?: number;
    ignoreServers?: boolean;
}

export interface ExgesisCompiledOptions {
    customFormats: CustomFormats;
    bodyParsers: MimeTypeRegistry<BodyParser>;
    parameterParsers: MimeTypeRegistry<StringParser>;
    maxParameters: number;
    defaultMaxBodySize: number;
    ignoreServers: boolean;
}

const INT_32_MAX = 2**32 - 1;
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
    const maxBodySize = options.defaultMaxBodySize || 100000;

    const mimeTypeParsers = Object.assign(
        {
            'text/*': new TextBodyParser(maxBodySize),
            'application/json': new JsonBodyParser(maxBodySize)
        },
        options.mimeTypeParsers || {}
    );

    const bodyParsers = new MimeTypeRegistry<BodyParser>(
        ld.pickBy(mimeTypeParsers, p => p.parseReq) as {[mimeType: string]: BodyParser}
    );

    const parameterParsers = new MimeTypeRegistry<StringParser>(
        ld.pickBy(mimeTypeParsers, p => p.parseString) as {[mimeType: string]: StringParser}
    );

    return {
        customFormats: Object.assign({}, defaultValidators, options.customFormats || {}),
        bodyParsers,
        parameterParsers,
        maxParameters: options.maxParameters || 10000,
        defaultMaxBodySize: maxBodySize,
        ignoreServers: options.ignoreServers || false
    };
}
