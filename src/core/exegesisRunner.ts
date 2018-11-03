import * as http from 'http';
import { Readable } from 'stream';

import { invokeController } from '../controllers/invoke';
import stringToStream from '../utils/stringToStream';
import { ValidationError } from '../errors';
import { ApiInterface, ResolvedOperation } from '../types/internal';
import bufferToStream from '../utils/bufferToStream';
import { isReadable } from '../utils/typeUtils';
import {
    ExegesisRunner,
    HttpResult,
    ExegesisContext,
    ResponseValidationCallback,
    ExegesisOptions,
    ExegesisResponse
} from '../types';
import ExegesisContextImpl from './ExegesisContextImpl';
import PluginsManager from './PluginsManager';
import {IValidationError} from "../types/validation";
import {handleErrorFunction} from "../types/options";

async function handleSecurity(operation: ResolvedOperation, context: ExegesisContext) {
    const authenticated = await operation.authenticate(context);
    context.security = authenticated;
    if(authenticated) {
        const matchedSchemes = Object.keys(authenticated);
        if(matchedSchemes.length === 1) {
            context.user = authenticated[matchedSchemes[0]].user;
        }
    }
}

function setDefaultContentType(res: ExegesisResponse) {
    const body = res.body;
    if(res.headers['content-type']) {
        // Nothing to do!
    } else if(body === undefined || body === null) {
        // Do nothing
    } else if(body instanceof Buffer) {
        res.headers['content-type'] = 'text/plain';
    } else if(typeof body === 'string') {
        res.headers['content-type'] = 'text/plain';
    } else if(isReadable(body)) {
        res.headers['content-type'] = 'text/plain';
    } else {
        res.headers['content-type'] = 'application/json';
    }
}

function resultToHttpResponse(
    context: ExegesisContext,
    result: any
) : HttpResult {
    let output: Readable | undefined;
    const headers = context.res.headers;

    if(result) {
        if(result instanceof Buffer) {
            output = bufferToStream(result);
        } else if(typeof result === 'string') {
            output = stringToStream(result);
        } else if(isReadable(result)) {
            output = result;
        } else {
            if(!headers['content-type']) {
                headers['content-type'] = 'application/json';
            }
            output = stringToStream(JSON.stringify(result), 'utf-8');
        }
    }

    return {
        status: context.res.statusCode,
        headers,
        body: output
    };
}

function handleError(err: Error) {
    if(err instanceof ValidationError) {
        // TODO: Allow customization of validation error?  Or even
        // just throw the error instead of turning it into a message?
        const jsonError = {
            message: "Validation errors",
            errors: err.errors.map((error :IValidationError) => {
                return {
                    message: error.message,
                    location: error.location,
                };
            })
        };
        return {
            status: err.status,
            headers: {"content-type": "application/json"},
            body: stringToStream(JSON.stringify(jsonError), 'utf-8')
        };
    } else if(Number.isInteger((err as any).status)) {
        return {
            status: (err as any).status,
            headers: {"content-type": "application/json"},
            body: stringToStream(JSON.stringify({message: err.message}), 'utf-8')
        };
    } else {
        throw err;
    }
}

/**
 * Returns a `(req, res) => Promise<boolean>` function, which handles incoming
 * HTTP requests.  The returned function will return true if the request was
 * handled, and false otherwise.
 *
 * @returns runner function.
 */
export default async function generateExegesisRunner<T>(
    api: ApiInterface<T>,
    options: {
        autoHandleHttpErrors: boolean | handleErrorFunction,
        plugins: PluginsManager,
        onResponseValidationError: ResponseValidationCallback,
        validateDefaultResponses: boolean,
        originalOptions: ExegesisOptions
    }
) : Promise<ExegesisRunner> {
    const plugins = options.plugins;

    return async function exegesisRunner(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ) : Promise<HttpResult | undefined> {
        const method = req.method || 'get';
        const url = req.url || '/';

        let result: HttpResult | undefined;

        try {

            const resolved = api.resolve(method, url, req.headers);
            if(!resolved) {
                return result;
            }

            const context = new ExegesisContextImpl<T>(req, res, resolved.api, options.originalOptions);

            if(!context.isResponseFinished()) {
                await plugins.postRouting(context);
            }

            if(resolved.operation) {
                const {operation} = resolved;

                context._setOperation(operation);

                if(!operation.controllerModule || !operation.controller) {
                    throw new Error(`No controller found for ${method} ${url}`);
                }

                await handleSecurity(operation, context);

                if(!context.isResponseFinished()) {
                    await plugins.postSecurity(context);
                }

                if(!context.isResponseFinished()) {
                    // Fill in context.params and context.requestBody.
                    await context.getParams();
                    await context.getRequestBody();
                }

                if(!context.isResponseFinished()) {
                    await invokeController(
                        operation.controllerModule,
                        operation.controller,
                        context
                    );
                }

                if(!context.origRes.headersSent) {
                    // Set _afterController to allow postController() plugins to
                    // modify the response.
                    context.res._afterController = true;
                    await plugins.postController(context);
                }

                if(!context.origRes.headersSent) {
                    // Before response validation, if there is a body and no
                    // content-type has been set, set a reasonable default.
                    setDefaultContentType(context.res);

                    if(options.onResponseValidationError) {
                        const responseValidationResult = resolved.operation.validateResponse(
                            context.res,
                            options.validateDefaultResponses
                        );
                        try {
                            if(responseValidationResult.errors && responseValidationResult.errors.length) {
                                options.onResponseValidationError({
                                    errors: responseValidationResult.errors,
                                    isDefault: responseValidationResult.isDefault,
                                    context
                                });
                            }
                        } catch(err) {
                            err.status = err.status || 500;
                            throw err;
                        }
                    }
                }

                if(!context.origRes.headersSent) {
                    result = resultToHttpResponse(context, context.res.body);
                }
            }

            return result;

        } catch (err) {
            if(options.autoHandleHttpErrors) {
                if (options.autoHandleHttpErrors instanceof Function) {
                    return options.autoHandleHttpErrors(err);
                }
                return handleError(err);
            } else {
                throw err;
            }
        }
    };
}
