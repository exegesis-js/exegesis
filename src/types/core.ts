import * as http from 'http';
import * as net from 'net';

import { Callback, ParametersByLocation, ParametersMap } from './basicTypes';

export interface ExegesisAuthenticated {
    user?: any;
    roles? : string[] | undefined;
    scopes? : string[] | undefined;
}

export type PromiseSecurityPlugin =
    (context: ExegesisContext) => ExegesisAuthenticated | undefined | Promise<ExegesisAuthenticated>;
export type CallbackSecurityPlugin =
    (context: ExegesisContext, done: Callback<ExegesisAuthenticated | undefined>) => void;
export type SecurityPlugin = PromiseSecurityPlugin | CallbackSecurityPlugin;
export interface SecurityPlugins {
    [scheme: string]: SecurityPlugin;
}

export interface HttpHeaders {
    [header: string]: number | string | string[];
}

export interface ExegesisResponse {
    statusCode: number;
    statusMessage: string | undefined;
    headers: HttpHeaders;
    body: any;
    connection: net.Socket;
    ended: boolean;

    setStatus(status: number) : this;
    header(header: string, value: number | string | string[] | undefined) : this;
    set(header: string, value: number | string | string[] | undefined) : this;
    json(json: any) : void;
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

export interface ExegesisContext {
    readonly req: http.IncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponse;
    api: any;
    security?: ExegesisAuthenticated;
    user?: any;
    params?: ParametersByLocation<ParametersMap<any>>;
    body?: any;

    makeError(statusCode: number, message: string) : Error;

    /**
     * Returns true if the response has already been sent.
     */
    isResponseFinished() : boolean;
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

export type PromisePlugin = (context: ExegesisContext) => Promise<void> | void;
export type CallbackPlugin = (context: ExegesisContext, done: Callback<void>) => void;
export type Plugin = PromisePlugin | CallbackPlugin;

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
