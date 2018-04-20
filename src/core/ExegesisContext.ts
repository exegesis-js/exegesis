import http from 'http';
import http2 from 'http2';
import { ParametersByLocation, ParametersMap } from '../types/ApiInterface';

export interface ExegesisContext {
    req: http.IncomingMessage | http2.Http2ServerRequest;
    res: http.ServerResponse | http2.Http2ServerResponse;
    params: ParametersByLocation<ParametersMap<any>>;
}
