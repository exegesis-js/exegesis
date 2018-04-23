import { MimeTypeParser } from './bodyParser';
import { Controllers, SecurityPlugins } from './core';

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
 */
export interface ExegesisOptions {
    /**
     * A hash where keys are either mime types or  mimetype wildcards
     * (e.g. 'application/*'), and values are MimeTypeParsers.  Any
     * MimeTypeParser which implements `parseString()` will be used for parsing
     * parameters.  Any which implements `parseReq()` will be used for parsing
     * requests.
     */
    mimeTypeParsers?: {[mimeType: string]: MimeTypeParser};

    /**
     * An array of security plugins.  See
     * https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Security.md
     * for details.
     */
    securityPlugins?: SecurityPlugins;

    /**
     * Either a glob for controller modules, or a hash where keys are
     * controller file names and values are modules.  If this is not provided,
     * then Exegesis will never resolve a controller when calling
     * `ApiInterface.resolve()`.
     */
    controllers?: string | Controllers;

    /**
     * A hash where keys are format names.  Values can be one of:
     *
     *   * A RegExp for checking a string.
     *   * A `function(string) : boolean` for checking a string, which returns
     *     false the the string is invalid.
     *   * A `{validate, type}` object, where `type` is either "string" or "number",
     *     and validate is a `function(string) : boolean`.
     */
    customFormats?: CustomFormats;

    /**
     * If true, when resolving a path Exegesis will
     * ignore the "servers" section of the OpenAPI doc entirely.
     */
    ignoreServers?: boolean;

    /**
     * The maximum number of properties to parse from a query string or
     * parameter.  Defaults to 1000.
     */
    maxParameters?: number;

    /**
     * If a bodyParser does not support
     * `parseStream()`, this defines the maximum size of a body that will be
     * parsed by (most) built-in body parsers.  Note that some body parsers
     * may ignore this value, or pass a stream object directly as the body.
     */
    defaultMaxBodySize?: number;
}
