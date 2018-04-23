import { BodyParser } from './bodyParser';
import * as oas3 from 'openapi3-ts';
import { IValidationError, ValidatorFunction } from './validation';
import { ParametersByLocation, ParametersMap, JsonPath } from './basicTypes';
import { Controller } from './core';

export {oas3 as oas3};

export * from './bodyParser';
export * from './basicTypes';
export * from './core';
export * from './options';
export * from './validation';

export type ParsedParameterValidator =
    ((parameterValues: ParametersByLocation<ParametersMap<any>>) => IValidationError[] | null);

// This bit is OAS3 specific.  May change in future versions.
export interface ResolvedOAS3 {
    openApiDoc: oas3.OpenAPIObject;
    serverObject: oas3.ServerObject | undefined;
    pathPath: JsonPath;
    pathObject: oas3.PathItemObject;
    operationPath: JsonPath | undefined;
    operationObject: oas3.OperationObject | undefined;
    requestBodyMediaTypePath: JsonPath | undefined;
    requestBodyMediaTypeObject: oas3.MediaTypeObject | undefined;
}

export interface ResolvedOperation {
    parseParameters: (() => ParametersByLocation<ParametersMap<any>>);
    validateParameters: ParsedParameterValidator;
    bodyParser: BodyParser | undefined;
    validateBody: ValidatorFunction | undefined;
    exegesisControllerName: string | undefined;
    operationId: string | undefined;
    controller: Controller | undefined;
    // responseValidator;
    // responseContentType?;
}

export interface ResolvedPath {
    operation: ResolvedOperation | undefined;
    openapi: ResolvedOAS3;
}
