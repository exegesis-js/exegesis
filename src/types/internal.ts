import * as http from 'http';
import * as oas3 from 'openapi3-ts';

import {
    Controllers,
    CustomFormats,
    StringParser,
    BodyParser,
    SecurityPlugins,
    ParametersByLocation,
    ParametersMap,
    IValidationError,
    ExegesisNamedSecurityScheme,
    ValidatorFunction,
    Controller,
    ExegesisContext,
    JsonPath
} from '.';
import { MimeTypeRegistry } from "../utils/mime";

export interface ExgesisCompiledOptions {
    customFormats: CustomFormats;
    controllers: Controllers;
    securityPlugins: SecurityPlugins;
    bodyParsers: MimeTypeRegistry<BodyParser>;
    parameterParsers: MimeTypeRegistry<StringParser>;
    maxParameters: number;
    defaultMaxBodySize: number;
    ignoreServers: boolean;
}

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
    authenticate(context: ExegesisContext) : Promise<ExegesisNamedSecurityScheme | undefined>;
    // responseValidator;
    // responseContentType?;
}

export interface ResolvedPath {
    operation: ResolvedOperation | undefined;
    openapi: ResolvedOAS3;
}

// ApiInterface provides an interface into the `oas3` subdirectory.  The idea here is,
// when `oas4` comes along we can support it by writing a new `oas4` subdirectory
// that implements this same interface, and then we'll be able to support oas4
// wihtout changing anything.  (We'll see if this actually works.  :P)
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
        method: string,
        url: string,
        headers: http.IncomingHttpHeaders
    ) : ResolvedPath | undefined;
}
