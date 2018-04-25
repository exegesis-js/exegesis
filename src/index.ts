import * as http from 'http';
import * as oas3 from 'openapi3-ts';
import pb from 'promise-breaker';
import pump from 'pump';

import { compileOptions } from './options';
import { compile as compileOpenApi } from './oas3';
import generateExegesisRunner from './core/exegesisRunner';
import {
    ExegesisOptions,
    Callback,
    ExegesisRunner,
    HttpResult,
    MiddlewareFunction,
    HttpIncomingMessage
} from './types';

// Export all our public types.
export * from './types';

export function compileRunner(
    openApiDoc: string | oas3.OpenAPIObject,
    options?: ExegesisOptions
) : Promise<ExegesisRunner>;

export function compileRunner(
    openApiDoc: string | oas3.OpenAPIObject,
    options: ExegesisOptions,
    done: Callback<ExegesisRunner>
) : void;

/**
 * Returns a "runner" function - call `runner(req, res)` to get back a
 * `HttpResult` object.
 *
 * @param openApiDoc - A string, representing a path to the OpenAPI document,
 *   or a JSON object.
 * @param options - Options.  See docs/options.md
 * @param [done] - Optional callback.
 * @returns - null if `done` is provided, otherwise a Promise<ExegesisRunner>.
 *   ExegesisRunner is a `function(req, res)` which will handle an API call,
 *   and return an `HttpResult`.
 */
export function compileRunner(
    openApiDoc: string | oas3.OpenAPIObject,
    options?: ExegesisOptions,
    done?: Callback<ExegesisRunner>
) {
    return pb.addCallback(done, async () => {
        const compiledOptions = compileOptions(options);
        const apiInterface = await compileOpenApi(openApiDoc, compiledOptions);
        return generateExegesisRunner(apiInterface);
    });
}

export function writeHttpResult(httpResult: HttpResult, res: http.ServerResponse) : Promise<void>;
export function writeHttpResult(
    httpResult: HttpResult,
    res: http.ServerResponse,
    done: Callback<void>
) : void;

/**
 * Write an HttpResult returned by an `ExegesisRunner` to a response.
 */
export function writeHttpResult(
    httpResult: HttpResult,
    res: http.ServerResponse,
    done?: Callback<void>
) {
    return pb.addCallback(done, async () => {
        Object.keys(httpResult.headers).forEach(
            header => res.setHeader(header, httpResult.headers[header])
        );
        res.statusCode = httpResult.status;

        if(httpResult.body) {
            await pb.call((done2 : pump.Callback) => pump(httpResult.body!, res, done2));
        } else {
            res.end();
        }
    });
}

export function compileApi(
    openApiDoc: string | oas3.OpenAPIObject,
    options?: ExegesisOptions
) : Promise<MiddlewareFunction>;

export function compileApi(
    openApiDoc: string | oas3.OpenAPIObject,
    options: ExegesisOptions,
    done: Callback<MiddlewareFunction>
) : void;

/**
 * Returns a connect/express middleware function which implements the API.
 *
 * @param openApiDoc - A string, representing a path to the OpenAPI document,
 *   or a JSON object.
 * @param options - Options.  See docs/options.md
 * @param [done] - Optional callback.
 * @returns - null if `done` is provided, otherwise a Promise<MiddlewareFunction>.
 */
export function compileApi(
    openApiDoc: string | oas3.OpenAPIObject,
    options?: ExegesisOptions,
    done?: Callback<MiddlewareFunction>
) {
    return pb.addCallback(done, async () => {
        const runner = await compileRunner(openApiDoc, options);

        return function exegesisMiddleware(
            req: HttpIncomingMessage,
            res: http.ServerResponse,
            next: Callback<void>
        ) {
            runner(req, res)
            .then(result => {
                let answer : Promise<void> | undefined;

                if(!result) {
                    if(next) {next();}
                } else if(res.headersSent) {
                    // Someone else has already written a response.  :(
                } else if(result) {
                    answer = writeHttpResult(result, res);
                } else {
                    if(next) {next();}
                }
                return answer;
            })
            .catch(err => next ? next(err) : setImmediate(() => {throw err;}));
        };
    });
}
