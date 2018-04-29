import { JsonPath } from "./basicTypes";

export type ParameterLocationIn =  "path" | "server" | "query" | "cookie" | "header" | "request" | "response";

/**
 * The location of a parameter or property within a request.
 *
 * @property in - A description of where the error was located (e.g. 'path', 'query', 'request', etc...).
 * @property name - If this refers to a parameter, this is the name of the parameter.
 *   If `in` is 'request', this will be 'body'.
 * @property docPath - An array of strings which describes the path to the
 *   OpenAPI definition that is related to the parameter.
 * @property [path] - An array of strings which describes the path to the parameter.
 *   This may be omitted in some cases, for example if the error was in the body and
 *   the body is "image/gif", then this field doesn't really make sense.
 */
export interface ParameterLocation {
    in: ParameterLocationIn;
    name: string;
    docPath: JsonPath;
    path?: JsonPath;
}

export enum ErrorType {
    Error = "error",
    Warning = "warning"
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
