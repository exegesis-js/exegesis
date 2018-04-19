import http from 'http';
import * as oas3 from 'openapi3-ts';

import { JsonPath } from '../utils/jsonPaths';
import { ValidatorFunction, IValidationError } from './validation';
import { HttpMethod } from './common';
import { BodyParser } from '../bodyParsers/BodyParser';

export interface ParameterBag<T> {
    query: T;
    header: T;
    server: T;
    path: T;
    cookie: T;
}

// A collection of parameters from the server, path, query, cookies, etc...
export interface ParametersMap<T> {
    [key: string]: T;
}

export interface ResolvedPath {
    serverParams: ParametersMap<string | string[]> | undefined;
    parseParameters: (() => ParameterBag<ParametersMap<any>>) | undefined;
    validateParameters: ((parameterValues: ParameterBag<ParametersMap<any>>) => IValidationError[] | null) | undefined;
    bodyParser: BodyParser | undefined;
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
