import http from 'http';
import * as oas3 from 'openapi3-ts';

import { ParametersMap, ParameterBag } from '../oas3/types';
import { JsonPath } from '../utils/jsonPaths';
import { ValidatorFunction } from './validation';
import { HttpMethod } from './common';

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
