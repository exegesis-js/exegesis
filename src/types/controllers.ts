import * as http from 'http';
import * as http2 from 'http2';
import { Callback, ParametersByLocation, ParametersMap } from './basicTypes';

export interface ExegesisContext {
    req: http.IncomingMessage | http2.Http2ServerRequest;
    res: http.ServerResponse | http2.Http2ServerResponse;
    params: ParametersByLocation<ParametersMap<any>>;
}

export type PromiseController = (context: ExegesisContext) => any;
export type CallbackController = (context: ExegesisContext, done: Callback<any>) => void;

export type Controller = CallbackController | PromiseController;

export interface ControllerModule {
    [operationId: string]: Controller;
}

export interface Controllers {
    // controllerName can have "/"s in it.
    [controllerName: string]: ControllerModule;
}
