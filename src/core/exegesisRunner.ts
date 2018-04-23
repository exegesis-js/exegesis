import * as http from 'http';
import pb from 'promise-breaker';
import { Readable } from 'stream';

import { invokeController } from '../controllers/invoke';
import stringToStream from '../utils/stringToStream';
import { ValidationError } from '../errors';
import {
    Callback,
    ExegesisRunner,
    HttpResult,
    ExegesisContext
} from '../types';
import { ApiInterface, ResolvedOperation } from '../types/internal';
import ExegesisContextImpl from './ExegesisContextImpl';

async function handleSecurity(operation: ResolvedOperation, context: ExegesisContext) {
    const authenticated = await operation.authenticate(context);
    context.security = authenticated;
    context.user = authenticated && authenticated.user;
}

function parseAndValidateParameters(operation: ResolvedOperation, context: ExegesisContext) {
    context.params = operation.parseParameters();
    const errors = operation.validateParameters(context.params);
    if(errors && errors.length > 0) {
        throw new ValidationError(errors);
    }
}

async function parseAndValidateBody(operation: ResolvedOperation, context: ExegesisContext) {
    let body: any;
    if(operation.bodyParser) {
        body = await pb.call((done: Callback<void>) =>
            operation.bodyParser!.parseReq(context.req, context.origRes, done)
        );

        const bodyErrors = operation.validateBody && operation.validateBody(body);
        if(bodyErrors && bodyErrors.length > 0) {
            throw new ValidationError(bodyErrors);
        }
    }
    (context.req as any).body = body;
    context.body = body;
}

function resultToHttpResponse(
    context: ExegesisContext,
    result: any
) : HttpResult {
    let output: Readable | undefined;
    if(result) {
        if(result && result.pipe && (typeof result.pipe === 'function')) {
            output = result as Readable;
        } else {
            context.res.setHeader('content-type', 'application/json');
            output = stringToStream(JSON.stringify(result));
        }
    }

    return {
        status: context.res.statusCode,
        headers: context.res.headers,
        body: output
    };
}

/**
 * Returns a `(req, res) => Promise<boolean>` function, which handles incoming
 * HTTP requests.  The returned function will return true if the request was
 * handled, and false otherwise.
 *
 * @returns runner function.
 */
export default async function generateExegesisRunner(
    api: ApiInterface
) : Promise<ExegesisRunner> {
    return async (
        req: http.IncomingMessage,
        res: http.ServerResponse
    ) : Promise<HttpResult | undefined> => {
        const method = req.method || 'get';
        const url = req.url || '/';

        const resolved = api.resolve(method, url, req.headers);

        if(resolved && resolved.operation) {
            try {
                const {operation} = resolved;

                if(!operation.controller) {
                    throw new Error(`No operation found for ${method} ${url}`);
                }

                const context = new ExegesisContextImpl(req, res);
                await handleSecurity(operation, context);
                parseAndValidateParameters(operation, context);
                await parseAndValidateBody(operation, context);

                let controllerResult: any;
                if(!context.res.ended) {
                    controllerResult = await invokeController(operation.controller, context);
                    // TODO: Response validation goes here.
                }

                return resultToHttpResponse(context, context.res.body || controllerResult);
            } catch (err) {
                if(err instanceof ValidationError) {
                    // TODO: Allow customization of validation error?  Or even
                    // just throw the error instead of turning it into a message?
                    return {
                        status: err.status,
                        headers: {"content-type": "application/json"},
                        body: stringToStream(JSON.stringify({
                            message: "Validation errors",
                            errors: err.errors
                        }))
                    };
                } else {
                    throw err;
                }
            }
        } else {
            return undefined;
        }
    };
}