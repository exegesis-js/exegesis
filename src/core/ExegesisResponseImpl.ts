import * as http from 'http';
import * as net from 'net';
import * as types from '../types';
import { HttpHeaders } from '../types';

export default class ExegesisResponseImpl implements types.ExegesisResponse {
    private _body: any = undefined;
    _afterController: boolean = false;

    statusCode: number = 200;
    statusMessage: string | undefined = undefined;
    headers: types.HttpHeaders = Object.create(null);
    ended: boolean = false;
    connection: net.Socket;
    socket: net.Socket;
    headersSent: boolean = false;
    private _responseValidationEnabled: boolean;

    constructor(
        res: http.ServerResponse /* | http2.Http2ServerResponse */,
        responseValidationEnabled: boolean
    ) {
        if (!res.socket) {
            throw new Error('Response is already ended');
        }
        this.connection = this.socket = res.socket;
        this._responseValidationEnabled = responseValidationEnabled;
    }

    setStatus(status: number) {
        if (this.ended) {
            throw new Error('Trying to set status after response has been ended.');
        }
        this.statusCode = status;
        return this;
    }

    status(status: number) {
        return this.setStatus(status);
    }

    header(header: string, value: number | string | string[]) {
        this.setHeader(header, value);
        return this;
    }

    set(header: string, value: number | string | string[]) {
        this.setHeader(header, value);
        return this;
    }

    json(json: any) {
        this.set('content-type', 'application/json');
        if (this._responseValidationEnabled) {
            // Must stringify here, since the object or any of it's
            // nested values could have a toJSON().  Note this means
            // we'll have to parse it again when we do validation.
            this.setBody(JSON.stringify(json));
        } else {
            this.setBody(json);
        }
        return this;
    }

    pureJson(json: any) {
        this.set('content-type', 'application/json').setBody(json);
        return this;
    }

    setBody(body: any): this {
        if (this.ended && !this._afterController) {
            throw new Error('Trying to set body after response has been ended.');
        }
        this.body = body;
        return this;
    }

    set body(body: any) {
        this._body = body;
        this.end();
    }

    get body(): any {
        return this._body;
    }

    end() {
        this.headersSent = true;
        this.ended = true;
    }

    redirect(status: number, url: string): this;
    redirect(url: string): this;
    redirect(a: number | string, b?: string): this {
        if (typeof a === 'string' && !b) {
            this.writeHead(302, { Location: a });
        } else if (typeof a === 'number' && typeof b === 'string') {
            this.writeHead(a, { Location: b });
        } else {
            throw new Error('Invalid arguments to redirect');
        }
        this.end();

        return this;
    }

    setHeader(name: string, value: number | string | string[]) {
        if (this.ended && !this._afterController) {
            throw new Error('Trying to set header after response has been ended.');
        }
        this.headers[name.toLowerCase()] = value;
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
        if (this.ended && !this._afterController) {
            throw new Error('Trying to remove header after response has been ended.');
        }
        delete this.headers[name];
    }

    writeHead(statusCode: number, statusMessage?: string | HttpHeaders, headers?: HttpHeaders) {
        if (statusMessage && typeof statusMessage !== 'string') {
            headers = statusMessage;
            statusMessage = undefined;
        }
        this.statusCode = statusCode;

        if (headers) {
            for (const headerName of Object.keys(headers)) {
                this.setHeader(headerName, headers[headerName]);
            }
        }
        this.headersSent = true;
    }
}
