import * as http from 'http';

import {
    ParametersByLocation,
    ParametersMap,
    ExegesisContext,
    ExegesisSecurityScheme
} from '../types';
import ExegesisResponseImpl from './ExegesisResponseImpl';
import { HttpError } from '../errors';

export default class ExegesisContextImpl implements ExegesisContext {
    readonly req: http.IncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponseImpl;
    params: ParametersByLocation<ParametersMap<any>> | undefined;
    body: any;
    security: ExegesisSecurityScheme | undefined;
    user: any | undefined;

    constructor(
        req: http.IncomingMessage, // http2.Http2ServerRequest,
        res: http.ServerResponse, // http2.Http2ServerResponse,
    ) {
        this.req = req;
        this.origRes = res;
        this.res = new ExegesisResponseImpl(res);
    }

    makeError(statusCode: number, message: string) : HttpError {
        return new HttpError(statusCode, message);
    }

}