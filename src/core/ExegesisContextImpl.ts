import * as http from 'http';
import pb from 'promise-breaker';

import {
    ParametersByLocation,
    ParametersMap,
    ExegesisContext,
    ExegesisAuthenticated,
    HttpIncomingMessage,
    ExegesisPluginContext,
    Callback
} from '../types';
import ExegesisResponseImpl from './ExegesisResponseImpl';
import { HttpError, ValidationError } from '../errors';
import { ResolvedOperation } from '../types/internal';

const EMPTY_PARAMS = Object.freeze({
    query: Object.freeze(Object.create(null)),
    header: Object.freeze(Object.create(null)),
    server: Object.freeze(Object.create(null)),
    path: Object.freeze(Object.create(null)),
    cookie: Object.freeze(Object.create(null))
});

export default class ExegesisContextImpl<T> implements ExegesisContext, ExegesisPluginContext {
    readonly req: HttpIncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponseImpl;
    params: ParametersByLocation<ParametersMap<any>>;
    body: any;
    security?: {[scheme: string]: ExegesisAuthenticated};
    user: any | undefined;
    api: T;

    private readonly _operation: ResolvedOperation;
    private _paramsResolved: boolean = false;
    private _bodyResolved: boolean = false;

    constructor(
        req: http.IncomingMessage, // http2.Http2ServerRequest,
        res: http.ServerResponse, // http2.Http2ServerResponse,
        api: T,
        operation: ResolvedOperation
    ) {
        this.req = req as HttpIncomingMessage;
        this.origRes = res;
        this.res = new ExegesisResponseImpl(res);
        this.api = api;
        this._operation = operation;

        // Temporarily set params to EMPTY_PARAMS.  While we're being a
        // 'plugin context', this will be empty, but it will be filled in
        // before we get to the controllers.
        this.params = EMPTY_PARAMS;
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

    getParams() : Promise<ParametersByLocation<ParametersMap<any>>>;
    getParams(done: Callback<ParametersByLocation<ParametersMap<any>>>) : void;
    getParams(done?: Callback<any>) : Promise<ParametersByLocation<ParametersMap<any>>> | void {
        return pb.addCallback(done, () => {
            if(!this._paramsResolved) {
                this.params = this._operation.parseParameters();
                const errors = this._operation.validateParameters(this.params);
                if(errors && errors.length > 0) {
                    const err = new ValidationError(errors);
                    throw err;
                }
                this._paramsResolved = true;
            }
            return this.params;
        });
    }

    getBody() : Promise<any>;
    getBody(done: Callback<any>) : void;
    getBody(done?: Callback<any>) : Promise<any> | void {
        return pb.addCallback(done, async () => {
            if(!this._bodyResolved) {
                let body: any;
                if(this._operation.bodyParser) {
                    body = await pb.call((done: Callback<void>) =>
                        this._operation.bodyParser!.parseReq(this.req, this.origRes, done)
                    );
                    body = body || this.req.body;
                    const bodyErrors = this._operation.validateBody && this._operation.validateBody(body);
                    if(bodyErrors && bodyErrors.length > 0) {
                        throw new ValidationError(bodyErrors);
                    }
                }
                this.req.body = body;
                this.body = body;
                this._bodyResolved = true;
            }
            return this.body;
        });
    }

}