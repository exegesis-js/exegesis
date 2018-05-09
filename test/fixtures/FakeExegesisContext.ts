import * as http from 'http';
import {
    ExegesisContext,
    ExegesisResponse,
    AuthenticationSuccess,
    ParametersByLocation,
    ParametersMap
} from "../../src";
import { HttpError } from '../../src/errors';
import ExegesisResponseImpl from '../../src/core/ExegesisResponseImpl';

export default class FakeExegesisContext implements ExegesisContext {
    readonly req: http.IncomingMessage;
    readonly origRes: http.ServerResponse;
    readonly res: ExegesisResponse;
    api: any;
    security?: {[scheme: string]: AuthenticationSuccess};
    user?: any;
    params: ParametersByLocation<ParametersMap<any>> = {
        query: {},
        header: {},
        server: {},
        path: {},
        cookie: {}
    };
    body: any = {};

    constructor() {
        this.req = {} as http.IncomingMessage;
        this.origRes = {} as http.ServerResponse;
        this.res = new ExegesisResponseImpl(this.origRes);
    }

    makeError(statusCode: number, message: string) : Error {
        return new HttpError(statusCode, message);
    }

    /**
     * Returns true if the response has already been sent.
     */
    isResponseFinished() {
        return false;
    }
}