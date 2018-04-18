import * as ld from 'lodash';

import * as oas3 from 'openapi3-ts';
import { JsonPath } from '../types/common';
import { ExgesisCompiledOptions } from '../options';
import { resolveRef } from '../utils/json-schema-resolve-ref';

/**
 * This has common stuff that we want to pass all the way down through the OAS
 * heirarchy.  This also keeps track of the `path` that a given object was
 * generated from.
 */
export default class Oas3Context {
    readonly path: JsonPath;
    readonly openApiDoc: oas3.OpenAPIObject;
    readonly options: ExgesisCompiledOptions;

    /**
     * Create a new Oas3Context.
     *
     * @param path - The path to the object represented by this context.
     * @param openApiDoc - A fully resolved OpenAPI document, with no $refs.
     * @param options - Options.
     */
    constructor(path: JsonPath, openApiDoc: oas3.OpenAPIObject, options: ExgesisCompiledOptions)
    constructor(parent: Oas3Context, relativePath: JsonPath)
    constructor(a: any, b: any, options?: ExgesisCompiledOptions) {
        if(a instanceof Oas3Context && ld.isArray(b)) {
            // TODO: Could make this WAY more efficient with Object.create().
            const parent = a;
            const relativePath = b;
            this.path = parent.path.concat(relativePath);
            this.openApiDoc = parent.openApiDoc;
            this.options = parent.options;
        } else if(ld.isArray(a) && options) {
            this.path = a;
            this.openApiDoc = b;
            this.options = options;
        } else {
            throw new Error("Invalid parameters to Oas3Context constructor");
        }
    }

    childContext(relativePath: JsonPath | string) {
        if(ld.isArray(relativePath)) {
            return new Oas3Context(this, relativePath);
        } else {
            return new Oas3Context(this, [relativePath]);
        }
    }

    resolveRef(ref: string | any) {
        return resolveRef(this.openApiDoc, ref);
    }
}