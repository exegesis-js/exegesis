import * as http from 'http';
import * as net from 'net';
import * as oas3 from 'openapi3-ts';

import { Callback, ParametersByLocation, ParametersMap, HttpIncomingMessage } from './basicTypes';
import { Readable } from 'stream';
import { ParameterLocations, ParameterLocation, ExegesisOptions } from '.';
import { BodyParser } from './bodyParser';
import { IValidationError, ValidatorFunction, ResponseValidationResult } from './validation';

export interface HttpHeaders {
    [header: string]: number | string | string[];
}

export interface ExegesisResponse {
    statusCode: number;
    statusMessage: string | undefined;
    headers: HttpHeaders;
    body: Buffer | string | Readable | any;
    connection: net.Socket;
    ended: boolean;

    setStatus(status: number) : this;
    status(status: number) : this;
    setBody(body: any) : this;

    /**
     * Set the value of a header.
     * @param header - the header to set.
     * @param value - the value to set the header to.
     */
    header(header: string, value: number | string | string[] | undefined) : this;
    set(header: string, value: number | string | string[] | undefined) : this;
    json(json: any) : this;
    end(): void;
    setHeader(name: string, value: number | string | string[] | undefined) : void;
    getHeader(name: string) : number | string | string[] | undefined;
    getHeaderNames() : string[];
    getHeaders() : HttpHeaders;
    hasHeader(name: string) : boolean;
    removeHeader(name: string) : void;
    writeHead(statusCode: number, headers?: HttpHeaders) : void;
    writeHead(statusCode: number, statusMessage?: string, headers?: HttpHeaders) : void;
}

export interface ExegesisContextBase {
    readonly req: HttpIncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponse;
    api: any;
    security?: {[scheme: string]: AuthenticationSuccess};
    user?: any;
    parameterLocations?: ParameterLocations;

    makeError(statusCode: number, message: string) : Error;
    makeValidationError(message: string, parameterLocation: ParameterLocation) : Error;

    /**
     * Returns true if the response has already been sent.
     */
    isResponseFinished() : boolean;
}

export interface ExegesisContext extends ExegesisContextBase {
    parameterLocations: ParameterLocations;
    params: ParametersByLocation<ParametersMap<any>>;
    requestBody: any;
    options: ExegesisOptions;
}

export interface ExegesisPluginContext extends ExegesisContextBase {
    getParams() : Promise<ParametersByLocation<ParametersMap<any>>>;
    getParams(done: Callback<ParametersByLocation<ParametersMap<any>>>) : void;
    getRequestBody() : Promise<any>;
    getRequestBody(done: Callback<any>) : void;
}

export interface OAS3ApiInfo {
    openApiDoc: oas3.OpenAPIObject;
    serverPtr: string | undefined;
    serverObject: oas3.ServerObject | undefined;
    pathItemPtr: string;
    pathItemObject: oas3.PathItemObject;
    operationPtr: string | undefined;
    operationObject: oas3.OperationObject | undefined;
    requestBodyMediaTypePtr: string | undefined;
    requestBodyMediaTypeObject: oas3.MediaTypeObject | undefined;
}

export type PromiseController = (context: ExegesisContext) => any;
export type CallbackController = (context: ExegesisContext, done: Callback<any>) => void;
export type Controller = PromiseController | CallbackController;

export interface ControllerModule {
    [operationId: string]: Controller;
}

export interface Controllers {
    // controllerName can have "/"s in it.
    [controllerName: string]: ControllerModule;
}

export interface AuthenticationFailure {
    type: "invalid" | "missing";
    status?: number;
    message?: string;
    challenge?: string;
}

export interface AuthenticationSuccess {
    type: "success";
    user?: any;
    roles? : string[] | undefined;
    scopes? : string[] | undefined;
    [name: string]: any;
}

export type AuthenticationResult = AuthenticationSuccess | AuthenticationFailure;

export interface AuthenticatorInfo {
    in?: "query" | "header" | "cookie";
    name?: string;
    scheme?: string;
}

export type PromiseAuthenticator = (
    context: ExegesisPluginContext,
    info: AuthenticatorInfo
) => AuthenticationResult | undefined | Promise<AuthenticationResult | undefined>;
export type CallbackAuthenticator = (
    context: ExegesisPluginContext,
    info: AuthenticatorInfo,
    done: Callback<AuthenticationResult | undefined>
) => void;
export type Authenticator = PromiseAuthenticator | CallbackAuthenticator;
export interface Authenticators {
    [scheme: string]: Authenticator;
}

/**
 * Result returned by the exegesisRunner.
 */
export interface HttpResult {
    headers: HttpHeaders;
    status: number;
    body: NodeJS.ReadableStream | undefined;
}

/**
 * A function which takes in a request and response, and returns an HttpResult.
 *
 * @throws {ValidationError} - If a validation error occurs in the parameters or the body.
 * @throws {HttpError} - If a non-validation error occurs, and an HTTP error code is suggested.
 * @throws {Error} - If any other error occurs.
 */
export type ExegesisRunner = (
    req: http.IncomingMessage,
    res: http.ServerResponse
) => Promise<HttpResult | undefined>;

export type ParsedParameterValidator =
    (parameterValues: ParametersByLocation<ParametersMap<any>>) => IValidationError[] | null;

export interface ResolvedOperation {
    parseParameters: (() => ParametersByLocation<ParametersMap<any>>);
    validateParameters: ParsedParameterValidator;
    parameterLocations: ParameterLocations;
    bodyParser: BodyParser | undefined;
    validateBody: ValidatorFunction | undefined;
    exegesisControllerName: string | undefined;
    operationId: string | undefined;
    controllerModule: ControllerModule | undefined;
    controller: Controller | undefined;

    validateResponse(
        response: ExegesisResponse,
        validateDefaultResponses: boolean
    ): ResponseValidationResult;

    // Returns the authentication data, or undefined if user could not be authenticated.
    authenticate(context: ExegesisContext): Promise<{ [scheme: string]: AuthenticationSuccess } | undefined>;
}

export interface ResolvedPath<T> {
    operation: ResolvedOperation | undefined;
    api: T;
}

// ApiInterface provides an interface into the `oas3` subdirectory.  The idea here is,
// when `oas4` comes along we can support it by writing a new `oas4` subdirectory
// that implements this same interface, and then we'll be able to support oas4
// wihtout changing anything.  (We'll see if this actually works.  :P)
export interface ApiInterface<T> {
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
    ): ResolvedPath<T> | undefined;
}

export interface ExegesisPluginInstance {
    /**
     * Called exactly once, before Exegesis "compiles" the API document.
     * Plugins must not modify apiDoc here.
     *
     * @param data.apiDoc - the API document.
     */
    preCompile?:
        ((data: {apiDoc: any}) => void | Promise<void>) |
        ((data: {apiDoc: any}, done: Callback<void>) => void);

    /**
     * Called immediately after the routing phase.  Note that this is
     * called before Exegesis verifies routing was valid - the
     * `pluginContext.api` object will have information about the
     * matched route, but will this information may be incomplete.
     * For example, for OAS3 we may have matched a route, but not
     * matched an operation within the route. Or we may have matched
     * an operation but that operation may have no controller defined.
     * (If we failed to match a route at all, this will not be called.)
     *
     * If your API added a route to the API document, this function is a
     * good place to write a reply.
     *
     * @param pluginContext - the plugin context.
     */
    postRouting?:
        ((pluginContext: ExegesisPluginContext) => void | Promise<void>) |
        ((pluginContext: ExegesisPluginContext, done: Callback<void>) => void);

    /**
     * Called for each request, after security phase and before input
     * is parsed and the controller is run.  This is a good place to
     * do extra security checks.  The `exegesis-plugin-roles` plugin,
     * for example, generates a 403 response here if the authenticated
     * user has insufficient privliedges to access this path.
     *
     * Note that this function will not be called if a previous pluing
     * has already written a response.
     *
     * @param pluginContext - the plugin context.
     */
    postSecurity?:
        ((pluginContext: ExegesisPluginContext) => void | Promise<void>) |
        ((pluginContext: ExegesisPluginContext, done: Callback<void>) => void);

    /**
     * Called immediately after the controller has been run, but before
     * any response validation.  This is a good place to do custom
     * response validation.  If you have to deal with something weird
     * like XML, this is where you'd handle it.
     *
     * This function can modify the contents of the response.
     *
     * @param context - The exegesis plugin context.
     */
    postController?:
        ((pluginContext: ExegesisContext) => void | Promise<void>) |
        ((pluginContext: ExegesisContext, done: Callback<void>) => void);
}

export interface ExegesisPlugin {
    info: {
        name: string
    };
    makeExegesisPlugin(data: {apiDoc: any}) : ExegesisPluginInstance;
}
