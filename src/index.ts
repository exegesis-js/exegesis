// import * as http from 'http';
import * as oas3 from 'openapi3-ts';
import pb from 'promise-breaker';
// import pump from 'pump';
import $RefParser from 'json-schema-ref-parser';

import { compileOptions } from './options';
import { compile as compileOpenApi } from './oas3';
import generateExegesisRunner from './core/exegesisRunner';
import {
  ExegesisOptions,
  Callback,
  ExegesisRunner,
  HttpResult,
  MiddlewareFunction,
  // HttpIncomingMessage
} from './types';
export { HttpError, ValidationError } from './errors';
import { OpenAPIObject } from 'openapi3-ts';
import { Context as KoaContext } from 'koa';
import PluginsManager from './core/PluginsManager';
// Export all our public types.
export * from './types';

/**
 * Reads a JSON or YAML file and bundles all $refs, resulting in a single
 * document with only internal refs.
 *
 * @param openApiDocFile - The file containing the document, or a JSON object.
 * @returns - Returns the bundled document
 */
function bundle(openApiDocFile: string | object): Promise<object> {
  const refParser = new $RefParser();

  return refParser.bundle(openApiDocFile as any, {
    dereference: { circular: false },
  });
}

/**
 * Returns a "runner" function - call `runner(req, res)` to get back a
 * `HttpResult` object.
 *
 * @param openApiDoc - A string, representing a path to the OpenAPI document,
 *   or a JSON object.
 * @param [options] - Options.  See docs/options.md
 * @returns - a Promise<ExegesisRunner>.  ExegesisRunner is a
 *   `function(req, res)` which will handle an API call, and return an
 *   `HttpResult`, or `undefined` if the request could not be handled.
 */
export function compileRunner(
  openApiDoc: string | oas3.OpenAPIObject,
  options?: ExegesisOptions,
): Promise<ExegesisRunner>;

/**
 * Returns a "runner" function - call `runner(req, res)` to get back a
 * `HttpResult` object.
 *
 * @param openApiDoc - A string, representing a path to the OpenAPI document,
 *   or a JSON object.
 * @param options - Options.  See docs/options.md
 * @param done - Callback which retunrs an ExegesisRunner.  ExegesisRunner is a
 *   `function(req, res)` which will handle an API call, and return an
 *   `HttpResult`, or `undefined` if the request could not be handled.
 */
export function compileRunner(
  openApiDoc: string | oas3.OpenAPIObject,
  options: ExegesisOptions | undefined,
  done: Callback<ExegesisRunner>,
): void;

export function compileRunner(
  openApiDoc: string | oas3.OpenAPIObject,
  options?: ExegesisOptions,
  done?: Callback<ExegesisRunner>,
) {
  return pb.addCallback(done, async () => {
    options = options || {};

    const compiledOptions = compileOptions(options);
    const bundledDoc = await bundle(openApiDoc);

    const plugins = new PluginsManager(
      bundledDoc,
      (options || {}).plugins || [],
    );

    await plugins.preCompile({ apiDoc: bundledDoc, options });

    const apiInterface = await compileOpenApi(
      bundledDoc as OpenAPIObject,
      compiledOptions,
    );

    return generateExegesisRunner(apiInterface, {
      autoHandleHttpErrors: compiledOptions.autoHandleHttpErrors,
      plugins,
      onResponseValidationError: compiledOptions.onResponseValidationError,
      validateDefaultResponses: compiledOptions.validateDefaultResponses,
      originalOptions: options,
    });
  });
}

/**
 * Convenience function which writes an `HttpResult` obtained from an
 * ExegesisRunner out to an HTTP response.
 *
 * @param httpResult - Result to write.
 * @param res - The response to write to.
 * @returns - a Promise which resolves on completion.
 */
export function writeHttpResult(
  httpResult: HttpResult,
  ctx: KoaContext,
): Promise<void>;

/**
 * Convenience function which writes an `HttpResult` obtained from an
 * ExegesisRunner out to an HTTP response.
 *
 * @param httpResult - Result to write.
 * @param res - The response to write to.
 * @param callback - Callback to call on completetion.
 */
export function writeHttpResult(
  httpResult: HttpResult,
  ctx: KoaContext,
  done: Callback<void>,
): void;

export function writeHttpResult(
  httpResult: HttpResult,
  ctx: KoaContext,
  done?: Callback<void>,
) {
  return pb.addCallback(done, async () => {
    Object.keys(httpResult.headers).forEach(header =>
      ctx.set(header, String(httpResult.headers[header])),
    );
    ctx.status = httpResult.status;

    if (httpResult.body) {
      ctx.body = httpResult.body;
    }
  });
}

/**
 * Returns a connect/express middleware function which implements the API.
 *
 * @param openApiDoc - A string, representing a path to the OpenAPI document,
 *   or a JSON object.
 * @param [options] - Options.  See docs/options.md
 * @returns - a Promise<MiddlewareFunction>.
 */
export function compileApi(
  openApiDoc: string | oas3.OpenAPIObject,
  options?: ExegesisOptions | undefined,
): Promise<MiddlewareFunction>;

/**
 * Returns a connect/express middleware function which implements the API.
 *
 * @param openApiDoc - A string, representing a path to the OpenAPI document,
 *   or a JSON object.
 * @param options - Options.  See docs/options.md
 * @param done - callback which returns the MiddlewareFunction.
 */
export function compileApi(
  openApiDoc: string | oas3.OpenAPIObject,
  options: ExegesisOptions | undefined,
  done: Callback<MiddlewareFunction>,
): void;

export function compileApi(
  openApiDoc: string | oas3.OpenAPIObject,
  options?: ExegesisOptions | undefined,
  done?: Callback<MiddlewareFunction> | undefined,
) {
  return pb.addCallback(done, async () => {
    const runner = await compileRunner(openApiDoc, options);

    return async function exegesisMiddleware(ctx: KoaContext, next: Callback<void>) {
      try {
        const result = await runner(ctx.req, ctx.res);
        if (!result) {
          if (next) {
            await next();
          }
        } else if (ctx.headerSent) {
          // Someone else has already written a response.  :(
        } else if (result) {
          await writeHttpResult(result, ctx);
        } else {
          if (next) {
            await next();
          }
        }
      } catch (err) {
        throw err;
        // return ctx.throw(err.status || 500, err.message);
      }
    };
  });
}
