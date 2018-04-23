import * as http from 'http';
import * as http2 from 'http2'; // TODO: Is this going to cause interop problems with older versions of node.js?
import * as net from 'net';
import { ExegesisResponse } from '../types';

export default class ExegesisResponseImpl implements ExegesisResponse {
    statusCode: number = 200;
    statusMessage: string | undefined = undefined;
    headers: http.OutgoingHttpHeaders = {};
    _body: any = undefined;
    ended: boolean = false;
    connection: net.Socket;

    constructor(res: http.ServerResponse | http2.Http2ServerResponse) {
        this.connection = res.connection;
    }

    setStatus(status: number) {
        if(this.ended) {
            throw new Error("Trying to set status after response has been ended.");
        }
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
        if(this.ended) {
            throw new Error("Trying to set JSON content after response has been ended.");
        }
        this.body = json;
        this.ended = true;
    }

    set body(body: any) {
        this._body = body;
        this.ended = true;
    }

    get body() : any {
        return this._body;
    }

    end() {
        this.ended = true;
    }

    setHeader(name: string, value: number | string | string[] | undefined) {
        if(this.ended) {
            throw new Error("Trying to set header after response has been ended.");
        }
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
        if(this.ended) {
            throw new Error("Trying to remove header after response has been ended.");
        }
        delete this.headers[name];
    }
}
