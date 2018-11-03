import { ExegesisContext } from ".";
import * as ajv from "ajv";

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
    docPath: string;
    path?: string;
}

/**
 * A dictionary of parameters, where keys are the source of the parameters.
 */
export interface ParameterLocations {
    path: {[parameter: string]: ParameterLocation};
    query: {[parameter: string]: ParameterLocation};
    cookie: {[parameter: string]: ParameterLocation};
    header: {[parameter: string]: ParameterLocation};
    request?: {body: ParameterLocation};
    response?: {body: ParameterLocation};
}

/**
 * A validation error.
 *
 * @property message - A short message about what was wrong.
 * @property location - The location of the parameter/property that caused the
 *   error.
 * @property ajvError - The raw Ajv error returned for the validator. Can be used to customise error messages.
 */
export interface IValidationError {
    message: string;
    location?: ParameterLocation;
    ajvError?: ajv.ErrorObject;
}

/**
 * Validates a document.
 *
 * Note that this may modify the document in place.  For example, this may
 * convert strings into numbers, or convert a single element into an array,
 * in order to conform to the schema.
 *
 * @returns an `{errors, value}` object, wehre `errors` is a list of errors,
 *   or `null` if validation was successful, and `value` is the validated
 *   (possibly modified) value.
 */
export interface ValidatorFunction {
    (doc: any) : {
        errors: IValidationError[] | null,
        value: any
    };
}

export interface ResponseValidationResult {
    errors: IValidationError[] | null;
    isDefault: boolean;
}

export interface ResponseValidationCallback {
    (result: {
        errors: IValidationError[];
        isDefault: boolean;
        context: ExegesisContext;
    }): void;
}