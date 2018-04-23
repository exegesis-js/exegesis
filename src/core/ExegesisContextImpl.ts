import * as http from 'http';

import { ParametersByLocation, ParametersMap, ExegesisContext, ExegesisResponse } from '../types';
import ExegesisResponseImpl from './ExegesisResponseImpl';

export default class ExegesisContextImpl implements ExegesisContext {
    readonly req: http.IncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponse;
    params: ParametersByLocation<ParametersMap<any>> | undefined;
    body: any;

    constructor(
        req: http.IncomingMessage, // http2.Http2ServerRequest,
        res: http.ServerResponse, // http2.Http2ServerResponse,
        params: ParametersByLocation<ParametersMap<any>> | undefined,
        body: any
    ) {
        this.req = req;
        this.origRes = res;
        this.res = new ExegesisResponseImpl(res);
        this.params = params;
        this.body = body;
    }

}