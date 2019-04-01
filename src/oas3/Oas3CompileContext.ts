import * as ld from 'lodash';

import * as oas3 from 'openapi3-ts';
import * as jsonPtr from 'json-ptr';
import { resolveRef } from '../utils/json-schema-resolve-ref';

import { ExegesisCompiledOptions } from '../options';

/**
 * A path to an object within a JSON document.
 */
export type JsonPath = string[];

/**
 * This has common stuff that we want to pass all the way down through the OAS
 * heirarchy.  This also keeps track of the `path` that a given object was
 * generated from.
 */
export default class Oas3CompileContext {
    readonly path: JsonPath;
    readonly jsonPointer: string;
    readonly openApiDoc: oas3.OpenAPIObject;
    readonly options: ExegesisCompiledOptions;

    /**
     * Create a new Oas3CompileContext.
     *
     * @param openApiDoc - A fully resolved OpenAPI document, with no $refs.
     * @param path - The path to the object represented by this context.
     * @param options - Options.
     */
    constructor(openApiDoc: oas3.OpenAPIObject, path: JsonPath, options: ExegesisCompiledOptions)
    constructor(parent: Oas3CompileContext, relativePath: JsonPath)
    constructor(a: any, path: JsonPath, options?: ExegesisCompiledOptions) {
        if(a instanceof Oas3CompileContext) {
            // TODO: Could make this WAY more efficient with Object.create().
            const parent = a;
            this.path = parent.path.concat(path);
            this.openApiDoc = parent.openApiDoc;
            this.options = parent.options;
        } else if(options) {
            this.path = path;
            this.openApiDoc = a;
            this.options = options;
        } else {
            throw new Error("Invalid parameters to Oas3CompileContext constructor");
        }
        this.jsonPointer = jsonPtr.encodePointer(this.path);
    }

    childContext(relativePath: JsonPath | string) {
        if(ld.isArray(relativePath)) {
            return new Oas3CompileContext(this, relativePath);
        } else {
            return new Oas3CompileContext(this, [relativePath]);
        }
    }

    resolveRef(ref: string | any) {
        return resolveRef(this.openApiDoc, ref);
    }
}