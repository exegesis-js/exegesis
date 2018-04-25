import * as http from 'http';

import {
    ParametersByLocation,
    ParametersMap,
    ExegesisContext,
    ExegesisSecurityScheme
} from '../types';
import ExegesisResponseImpl from './ExegesisResponseImpl';
import { HttpError } from '../errors';

export default class ExegesisContextImpl<T> implements ExegesisContext {
    readonly req: http.IncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponseImpl;
    params: ParametersByLocation<ParametersMap<any>> | undefined;
    body: any;
    security: ExegesisSecurityScheme | undefined;
    user: any | undefined;
    api: T;

    constructor(
        req: http.IncomingMessage, // http2.Http2ServerRequest,
        res: http.ServerResponse, // http2.Http2ServerResponse,
        api: T,
    ) {
        this.req = req;
        this.origRes = res;
        this.res = new ExegesisResponseImpl(res);
        this.api = api;
    }

    makeError(statusCode: number, message: string) : HttpError {
        return new HttpError(statusCode, message);
    }

}