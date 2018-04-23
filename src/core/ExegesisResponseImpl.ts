import * as http from 'http';
import * as http2 from 'http2'; // TODO: Is this going to cause interop problems with older versions of node.js?
import * as net from 'net';
import { HttpError } from '../errors';
import { ExegesisResponse } from '../types';

export default class ExegesisResponseImpl implements ExegesisResponse {
    statusCode: number = 200;
    statusMessage: string | undefined = undefined;
    headers: http.OutgoingHttpHeaders = {};
    body: any = undefined;
    connection: net.Socket;

    constructor(res: http.ServerResponse | http2.Http2ServerResponse) {
        this.connection = res.connection;
    }

    setStatus(status: number) {
        this.statusCode = status;
        return this;
    }

    header(header: string, value: number | string | string[] | undefined) {
        this.setHeader(header, value);
        return this;
    }

    set(header: string, value: number | string | string[] | undefined) {
        this.setHeader(header, value);
        return this;
    }

    json(json: any) {
        this.body = json;
    }

    error(message: string, statusCode?: number) : never {
        if(statusCode) {
            this.statusCode = statusCode;
        } else if(this.statusCode === 200) {
            this.statusCode = 500;
        }

        throw new HttpError(this.statusCode, message);
    }

    setHeader(name: string, value: number | string | string[] | undefined) {
        this.headers[name] = value;
    }

    getHeader(name: string) {
        return this.headers[name];
    }

    getHeaderNames() {
        return Object.keys(this.headers);
    }

    getHeaders() {
        return Object.assign({}, this.headers);
    }

    hasHeader(name: string) {
        return !!this.headers[name];
    }

    removeHeader(name: string) {
        delete this.headers[name];
    }
}
