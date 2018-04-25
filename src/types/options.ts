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
     * (e.g. 'application/*'), and values are MimeTypeParsers.  In order to be
     * used for parsing parameters, a MimeTypeParser must implement
     * `parseString()`.
     */
    mimeTypeParsers?: {[mimeType: string]: MimeTypeParser};

    /**
     * An array of security plugins.  See
     * https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Security.md
     * for details.
     */
    securityPlugins?: SecurityPlugins;

    /**
     * Either a folder which contains controller modules, or a hash where keys
     * are controller names and values are modules.  If this is not
     * provided, then Exegesis will never resolve a controller when calling
     * `ApiInterface.resolve()`.
     */
    controllers?: string | Controllers;

    /**
     * If `controllers` is a folder name, then this is a glob pattern used to
     * load controllers (e.g. `**\/*.@(ts|js)` to allow both Typescript and
     * Javascript files to be used as controllers.)  If `controllers` is
     * not a folder name, this is ignored.
     */
    controllersPattern?: string;

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
     * If a `MimeTypeParser` provided in `mimeTypeParsers` does not support
     * `parseReq()`, this defines the maximum size of a body that will be parsed.
     * Bodies longer than this will result in a "413 - Payload Too Large" error.
     * Built in body parsers will also respect this option.
     */
    defaultMaxBodySize?: number;

    /**
     * If false, then if any operations do not define a controller,
     * Exegesis will raise an error when the API is being compiled.  If
     * true, then Exegesis will simply pretend any operations that don't
     * have a controller do not exist, and will not handle them.
     *
     * Defaults to true.
     */
    allowMissingControllers?: boolean;
}
