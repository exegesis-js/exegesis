import http from 'http';
import http2 from 'http2';

export interface ExegesisContext {
    req: http.IncomingMessage | http2.Http2ServerRequest;
    res: http.ServerResponse | http2.Http2ServerResponse;
}
