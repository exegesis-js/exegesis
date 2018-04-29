import * as http from 'http';
import { Readable } from 'stream';

import { invokeController } from '../controllers/invoke';
import stringToStream from '../utils/stringToStream';
import { ValidationError } from '../errors';
import { ExegesisRunner, HttpResult, ExegesisContext } from '../types';
import { ApiInterface, ResolvedOperation } from '../types/internal';
import ExegesisContextImpl from './ExegesisContextImpl';
import bufferToStream from '../utils/bufferToStream';

async function handleSecurity(operation: ResolvedOperation, context: ExegesisContext) {
    const authenticated = await operation.authenticate(context);
    context.security = authenticated;
    context.user = authenticated && authenticated.user;
}

function resultToHttpResponse(
    context: ExegesisContext,
    result: any
) : HttpResult {
    let output: Readable | undefined;
    if(result) {
        if(result instanceof Buffer) {
            output = bufferToStream(result);
        } else if(typeof result === 'string') {
            output = stringToStream(result);
        } else if(result && result.pipe && (typeof result.pipe === 'function')) {
            output = result as Readable;
        } else {
            if(!context.res.getHeader('content-type')) {
                context.res.setHeader('content-type', 'application/json');
            }
            output = stringToStream(JSON.stringify(result), 'utf-8');
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
export default async function generateExegesisRunner<T>(
    api: ApiInterface<T>
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

                const context = new ExegesisContextImpl<T>(req, res, resolved.api, operation);
                await handleSecurity(operation, context);

                if(!context.isResponseFinished()) {
                    // Fill in context.params and context.body.
                    await context.getParams();
                    await context.getBody();
                }

                let controllerResult: any;
                if(!context.isResponseFinished()) {
                    controllerResult = await invokeController(operation.controller, context);
                    // TODO: Response validation goes here.
                }

                return resultToHttpResponse(context, context.res.body || controllerResult);
            } catch (err) {
                if(err instanceof ValidationError) {
                    // TODO: Allow customization of validation error?  Or even
                    // just throw the error instead of turning it into a message?
                    const jsonError = {
                        message: "Validation errors",
                        errors: err.errors
                    };
                    return {
                        status: err.status,
                        headers: {"content-type": "application/json"},
                        body: stringToStream(JSON.stringify(jsonError), 'utf-8')
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