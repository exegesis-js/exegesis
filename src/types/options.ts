import { StringParser, BodyParser } from './bodyParser';
import { Controllers, Authenticators, ExegesisPlugin } from './core';
import { ResponseValidationCallback } from './validation';

/**
 * A function which validates custom formats.
 */
export type CustomFormatChecker =  RegExp | ((value: string) => boolean);

export type handleErrorFunction = (err: Error) => any;

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
     * (e.g. 'application/*'), and values are StringParsers, BodyParsers, or
     * MimeTypeParsers.  In order to be used for parsing parameters, a
     * parser must implement `parseString()`.
     */
    mimeTypeParsers?: {[mimeType: string]: StringParser | BodyParser};

    /**
     * A hash of authenticators.  See
     * https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Security.md
     * for details.
     */
    authenticators?: Authenticators;

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

    /**
     * By default, ExegesisRunner will turn `exegesis.HttpError`s (such as errors
     * generated from `context.makeError()` and `exegesis.ValidationError`s into JSON
     * replies with appropriate error messages.  If you want to handle these errors
     * yourself, set this value to false.  Defaults to true. TODO
     */
    autoHandleHttpErrors?: boolean | handleErrorFunction;

    /**
     * If you provide this function, Exegesis will validate responses controllers
     * generate before they are sent to the client.  If you throw an exception,
     * a 500 error will be generated instead of sending the reply to the
     * client.
     *
     * Note that when bodies are strings, buffers, or streams, Exegesis
     * will not try to parse your body to see if it conforms to the
     * response schema; only JSON objects are validated.
     *
     * @param result.errors - A list of error objects.
     * @param result.isDefault - For OAS3, this is true if we validated against
     *   the `default` status code in the Responses object.
     */
    onResponseValidationError?: ResponseValidationCallback;

    /**
     * Controls how Exegesis validates responses.  If this is set to false, then
     * in OAS3 Exegesis will not do validation for responses unless the
     * response status code matches an explicit status code in the
     * responses object (not the "default" status code).  If this is set
     * to true, then all responses will be validated.
     *
     * This option is ignored if `onResponseValidationError` is not set.  If
     * `onResponseValidationError` is set, the default is true.
     */
    validateDefaultResponses?: boolean;

    /**
     * Array of plugins to run.
     */
    plugins?: ExegesisPlugin[];
}
