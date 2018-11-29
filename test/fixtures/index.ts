import * as jsonPtr from 'json-ptr';
import * as oas3 from 'openapi3-ts';
import Oas3CompileContext from '../../src/oas3/Oas3CompileContext';
import * as options from '../../src/options';

export const defaultCompiledOptions: options.ExgesisCompiledOptions = options.compileOptions();

export function makeOpenApiDoc(): oas3.OpenAPIObject {
    return {
        openapi: '3.0.1',
        info: {
            title: 'foo',
            version: '1.0.0',
        },
        paths: {},
    };
}

export function makeContext(
    openApiDoc: oas3.OpenAPIObject,
    jsonPointer: string,
    options?: Partial<options.ExgesisCompiledOptions>
) {
    return new Oas3CompileContext(
        openApiDoc,
        jsonPtr.decode(jsonPointer),
        Object.assign({}, defaultCompiledOptions, options || {})
    );
}
