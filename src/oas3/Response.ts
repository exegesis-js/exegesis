import * as oas3 from 'openapi3-ts';
import Oas3CompileContext from './Oas3CompileContext';
import { ValidatorFunction, IValidationError, ParameterLocation, HttpHeaders } from '../types';
import { MimeTypeRegistry } from '../utils/mime';
import { generateResponseValidator } from './Schema/validators';
import { isReadable } from '../utils/typeUtils';

export default class Responses {
    readonly context: Oas3CompileContext;
    private readonly _responseValidators: MimeTypeRegistry<ValidatorFunction>;
    private readonly _hasResponses: boolean;
    private readonly _location: ParameterLocation;

    constructor(context: Oas3CompileContext, response: oas3.ResponseObject) {
        this.context = context;
        this._hasResponses = false;
        this._responseValidators = new MimeTypeRegistry<ValidatorFunction>();
        this._location = {
            in: 'response',
            name: 'body',
            docPath: this.context.jsonPointer
        };

        if(response.content) {
            for(const mimeType of Object.keys(response.content)) {
                this._hasResponses = true;
                const mediaTypeObject = response.content[mimeType];
                let validator;
                if(mediaTypeObject.schema) {
                    const schemaContext = context.childContext(['content', mimeType, 'schema']);
                    validator = generateResponseValidator(
                        schemaContext,
                        this._location,
                        true // Responses are always required.
                    );
                } else {
                    validator = () => ({errors: null, value: undefined});
                }
                this._responseValidators.set(mimeType, validator);

            }
        }
    }

    validateResponse(statusCode: number, headers: HttpHeaders, body: any) : IValidationError[] | null {
        const contentType = headers['content-type'];

        if(!contentType) {
            if(body) {
                return [{
                    location: this._location,
                    message: `Response for ${statusCode} is missing content-type.`
                }];
            } else if(this._hasResponses) {
                return [{
                    location: this._location,
                    message: `Response for ${statusCode} expects body.`
                }];
            } else {
                return null;
            }
        } else if(typeof contentType !== 'string') {
            return [{
                location: this._location,
                message: `Invalid content type for ${statusCode} response: ${contentType}`
            }];
        } else {
            const validator = this._responseValidators.get(contentType);

            if(body === null || body === undefined) {
                return [{
                    location: this._location,
                    message: `Missing response body for ${statusCode}.`
                }];
            } else if(!validator) {
                return [{
                    location: this._location,
                    message: `Unexpected content-type for ${statusCode} response: ${contentType}.`
                }];
            } else if(typeof body === 'string' && contentType.startsWith('application/json')) {
                if(body.trim() === '') {
                    return validator(undefined).errors;
                }
                try {
                    return validator(JSON.parse(body)).errors;
                } catch(err) {
                    return [{
                        location: this._location,
                        message: `Could not parse content as JSON.`
                    }];
                }
            } else if(typeof body === 'string' || body instanceof Buffer || isReadable(body)) {
                // Can't validate this.
                return null;
            } else {
                return validator(body).errors;
            }
        }
    }
}