import * as http from 'http';
import pb from 'promise-breaker';
import { Readable } from 'stream';

import { invokeController } from '../controllers/invoke';
import stringToStream from '../utils/stringToStream';
import { ValidationError } from '../errors';
import { Callback, ExegesisRunner, HttpResult } from '../types';
import { ApiInterface } from '../types/internal';
import ExegesisResponseImpl from './ExegesisResponseImpl';
import ExegesisContextImpl from './ExegesisContextImpl';

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
            const {parseParameters, validateParameters, bodyParser, validateBody, controller} = resolved.operation;

            if(!controller) {
                throw new Error(`No operation found for ${method} ${url}`);
            }

            // FIXME: Run security handlers here.
            // FIXME: Verify that serurity requirements have been met.

            // Parse and validate parameters.
            const params = parseParameters();
            const errors = validateParameters(params);
            if(errors && errors.length > 0) {
                throw new ValidationError(errors);
            }

            // Parse and validate incoming body.
            let body: any;
            if(bodyParser) {
                body = await pb.call((done: Callback<void>) => bodyParser.parseReq(req, res, done));
                const bodyErrors = validateBody && validateBody(body);
                if(bodyErrors && bodyErrors.length > 0) {
                    throw new ValidationError(bodyErrors);
                }
            }
            (req as any).body = body;

            // Generate response.
            const response = new ExegesisResponseImpl(res);
            const context = new ExegesisContextImpl(req, res, body, params);

            const controllerResult = await invokeController(controller, context);
            const result = response.body || controllerResult;

            // TODO: Response validation goes here.

            // Convert result into an HTTP message.
            let output: Readable | undefined;
            if(result) {
                if(result && result.pipe && (typeof result.pipe === 'function')) {
                    output = result as Readable;
                } else {
                    // FIXME: response validation
                    response.setHeader('content-type', 'application/json');
                    output = stringToStream(JSON.stringify(result));
                }
            }

            return {
                status: response.statusCode,
                headers: response.headers,
                body: output
            };
        } else {
            return undefined;
        }
    };
}