import * as ld from 'lodash';

import * as oas3 from 'openapi3-ts';
import { pathToJsonPointer } from '../utils/jsonPaths';
import { resolveRef } from '../utils/json-schema-resolve-ref';

import { JsonPath } from '../types';
import { ExgesisCompiledOptions } from '../options';

/**
 * This has common stuff that we want to pass all the way down through the OAS
 * heirarchy.  This also keeps track of the `path` that a given object was
 * generated from.
 */
export default class Oas3Context {
    readonly path: JsonPath;
    readonly jsonPointer: string;
    readonly openApiDoc: oas3.OpenAPIObject;
    readonly options: ExgesisCompiledOptions;

    /**
     * Create a new Oas3Context.
     *
     * @param openApiDoc - A fully resolved OpenAPI document, with no $refs.
     * @param path - The path to the object represented by this context.
     * @param options - Options.
     */
    constructor(openApiDoc: oas3.OpenAPIObject, path: JsonPath, options: ExgesisCompiledOptions)
    constructor(parent: Oas3Context, relativePath: JsonPath)
    constructor(a: any, path: JsonPath, options?: ExgesisCompiledOptions) {
        if(a instanceof Oas3Context) {
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
            throw new Error("Invalid parameters to Oas3Context constructor");
        }
        this.jsonPointer = pathToJsonPointer(this.path);
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