import * as oas3 from 'openapi3-ts';
import Oas3CompileContext from './Oas3CompileContext';
import Response from './Response';
import { ParameterLocation, ResponseValidationResult, HttpHeaders } from '../types';

export default class Responses {
    readonly context: Oas3CompileContext;
    private readonly _responses: { [statusCode: string]: Response };
    private readonly _location: ParameterLocation;

    constructor(context: Oas3CompileContext, responses: oas3.ResponsesObject) {
        this.context = context;
        this._location = {
            in: 'response',
            name: 'body',
            docPath: this.context.jsonPointer,
        };

        this._responses = {};
        for (const statusCode of Object.keys(responses)) {
            const response: oas3.ResponseObject = context.resolveRef(responses[statusCode]);
            this._responses[statusCode] = new Response(context.childContext(statusCode), response);
        }
    }

    validateResponse(
        statusCode: number,
        headers: HttpHeaders,
        body: any,
        validateDefaultResponses: boolean
    ): ResponseValidationResult {
        const responseObject = this._responses[statusCode] || this._responses.default;
        if (!responseObject) {
            return {
                errors: [
                    {
                        location: this._location,
                        message: `No response defined for status code ${statusCode}.`,
                    },
                ],
                isDefault: false,
            };
        } else {
            const isDefault = !this._responses[statusCode];
            if (isDefault && !validateDefaultResponses) {
                return { errors: null, isDefault };
            } else {
                return {
                    errors: responseObject.validateResponse(statusCode, headers, body),
                    isDefault,
                };
            }
        }
    }
}
