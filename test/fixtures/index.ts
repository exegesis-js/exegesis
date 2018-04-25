import * as oas3 from 'openapi3-ts';

import * as options from '../../src/options';
import Oas3Context from '../../src/oas3/Oas3Context';
import { jsonPointerToPath } from '../../src/utils/jsonPaths';

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

export function makeContext(openApiDoc: oas3.OpenAPIObject, jsonPointer: string) {
    return new Oas3Context(openApiDoc, jsonPointerToPath(jsonPointer), defaultCompiledOptions);
}