import * as options from '../src/options';
import * as oas3 from 'openapi3-ts';

export const defaultCompiledOptions : options.ExgesisCompiledOptions = options.compileOptions();

export function makeOpenApiDoc() : oas3.OpenAPIObject {
    return {
        openapi: '3.0.1',
        info: {
            title: 'foo',
            version: '1.0.0'
        },
        paths: {
        }
    };
}