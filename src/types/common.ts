import { Readable } from 'stream';
import http from 'http';
import { ParametersMap, ParameterBag } from '../oas3/types';
import * as oas3 from 'openapi3-ts';

// TODO: Add docs for everything in here.

/**
 * A path to an object within a JSON document.
 *
 * `'#/' + path.map(encodeURIComponent).join('/')` would get you a JSON Ref.
 */
export type JsonPath = string[];

export enum ErrorType {
    Error = "error",
    Warning = "warning"
}

/**
 * The location of a parameter or property within a request.
 *
 * @property in - A description of where the error was located (e.g. 'path', 'query', 'body', etc...).
 * @property name - If this refers to a parameter, this is the name of the parameter.
 *   If `in` is 'body', this will be 'body' also.
 * @property docPath - An array of strings which describes the path to the
 *   OpenAPI definition that is related to the parameter.
 * @property [path] - An array of strings which describes the path to the parameter.
 *   This may be omitted in some cases, for example if the error was in the body and
 *   the body is "image/gif", then this field doesn't really make sense.
 */
export interface ParameterLocation {
    in: string; // "path" | "query" | "cookie" | "header" | "body";
    name: string;
    docPath: JsonPath;
    path?: JsonPath;
}

/**
 * A validation error.
 *
 * @property type - The type of validation error.  Either 'error' or 'warning'.
 * @property message - A short message about what was wrong.
 * @property location - The location of the parameter/property that caused the
 *   error.
 */
export interface IValidationError {
    type: ErrorType;
    message: string;
    location?: ParameterLocation;
}

/**
 * Validates a document.
 *
 * Note that this may modify the document in place.  For example, this may
 * convert strings into numbers, or convert a single element into an array,
 * in order to conform to the schema.
 *
 * @returns a list of errors, or `null` if validation was successful.
 */
export interface ValidatorFunction {
    (doc: any) : IValidationError[] | null;
}

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

export interface BodyParser {
    parseString: (value: string) => any;
    parseStream?: (value: Readable) => any;
}

// TODO: Move these to "httpTypes"?
export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE';

export const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE'];

export interface ResolvedPath {
    serverParams: ParametersMap | undefined;
    // parseParameters: operation && operation.parameterParser(serverParams, pathParams, parsedUrl.query),
    parseParameters: (() => ParameterBag<any>) | undefined;
    validateParameters: ValidatorFunction | undefined;
    // parseBody: mediaType && mediaType.bodyParser,
    validateBody: ValidatorFunction | undefined;
    // responseValidator,
    // responseContentType?,
    // controller
    openapi: {
        openApiDoc: oas3.OpenAPIObject;
        serverObject: oas3.ServerObject | undefined;
        pathPath: JsonPath;
        pathObject: oas3.PathItemObject;
        operationPath: JsonPath | undefined;
        operationObject: oas3.OperationObject | undefined;
        mediaTypePath: JsonPath | undefined;
        mediaTypeObject: oas3.MediaTypeObject | undefined;
    };
}

export interface ApiInterface {
    /**
     * Resolve an incoming request.
     *
     * @param method - The HTTP method used (e.g. 'GET').
     * @param url - The URL used to retrieve this request.
     * @param headers - Any headers sent along with the request.
     * @throws {ValidationError} if some parameters cannot be parsed.
     */
    resolve(
        method: HttpMethod,
        url: string,
        headers: http.IncomingHttpHeaders
    ) : ResolvedPath | undefined;
}