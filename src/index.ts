import pb from 'promise-breaker';

import { ExegesisOptions, Callback, ExegesisRunner } from './types';
import { compileOptions } from './options';
import { compile as compileOpenApi } from './oas3';
import generateExegesisRunner from './core/exegesisRunner';
import * as oas3 from 'openapi3-ts';

// Export all our public types.
export * from './types';

/**
 * Returns a "runner" function - call `runner(req, res)` to get back a
 * `HttpResult` object.
 *
 * @param openApiDoc - A string, representing a path to the OpenAPI document,
 *   or a JSON object.
 * @param options - Options.  See docs/options.md
 * @param [done] - Optional callback.  If not provided, this will return a
 *   Promise<ExegesisRunner>.
 */
export function compileApi(
    openApiDoc: string | oas3.OpenAPIObject,
    options: ExegesisOptions,
    done?: Callback<ExegesisRunner>
) {
    return pb.addCallback(done, async () => {
        const compiledOptions = compileOptions(options);
        const apiInterface = await compileOpenApi(openApiDoc, compiledOptions);
        return generateExegesisRunner(apiInterface);
    });
}
