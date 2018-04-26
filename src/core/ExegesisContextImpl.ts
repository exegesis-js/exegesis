import * as http from 'http';

import {
    ParametersByLocation,
    ParametersMap,
    ExegesisContext,
    ExegesisAuthenticated,
    HttpIncomingMessage
} from '../types';
import ExegesisResponseImpl from './ExegesisResponseImpl';
import { HttpError } from '../errors';

export default class ExegesisContextImpl<T> implements ExegesisContext {
    readonly req: HttpIncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponseImpl;
    params: ParametersByLocation<ParametersMap<any>> | undefined;
    body: any;
    security: ExegesisAuthenticated | undefined;
    user: any | undefined;
    api: T;

    constructor(
        req: http.IncomingMessage, // http2.Http2ServerRequest,
        res: http.ServerResponse, // http2.Http2ServerResponse,
        api: T,
    ) {
        this.req = req as HttpIncomingMessage;
        this.origRes = res;
        this.res = new ExegesisResponseImpl(res);
        this.api = api;
    }

    makeError(statusCode: number, message: string) : HttpError {
        return new HttpError(statusCode, message);
    }

    /**
     * Returns true if the response has already been sent.
     */
    isResponseFinished() {
        return this.res.ended || this.origRes.headersSent;
    }
}