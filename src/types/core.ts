import * as http from 'http';
import * as net from 'net';
import { Readable } from 'stream';

import { Callback, ParametersByLocation, ParametersMap } from './basicTypes';

export interface ExegesisResponse {
    statusCode: number;
    statusMessage: string | undefined;
    headers: http.OutgoingHttpHeaders;
    body: any;
    connection: net.Socket;

    setStatus(status: number) : this;
    header(header: string, value: number | string | string[] | undefined) : this;
    set(header: string, value: number | string | string[] | undefined) : this;
    json(json: any) : void;
    error(message: string, statusCode?: number) : never;
    setHeader(name: string, value: number | string | string[] | undefined) : void;
    getHeader(name: string) : number | string | string[] | undefined;
    getHeaderNames() : string[];
    getHeaders() : http.OutgoingHttpHeaders;
    hasHeader(name: string) : boolean;
    removeHeader(name: string) : void;
}

export interface ExegesisContext {
    readonly req: http.IncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponse;
    params: ParametersByLocation<ParametersMap<any>> | undefined;
    body: any;
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
    headers: {[key: string]: string | string[] | number | undefined};
    status: number;
    body: Readable | undefined;
}

/**
 * A function which takes in a request and response, and returns an HttpResult.
 */
export type ExegesisRunner = (
    req: http.IncomingMessage,
    res: http.ServerResponse
) => Promise<HttpResult | undefined>;
