import ld from 'lodash';
import traveseSchema from 'json-schema-traverse';
import * as jsonPaths from './jsonPaths';
import * as jsonPtr from 'json-ptr';
import { JSONSchema6, JSONSchema4 } from 'json-schema';
import {resolveRef} from './json-schema-resolve-ref';

function extractSchemaPriv(
    subtreeRef: string,
    refResolver: (ref: string) => any | undefined,
    options: {
        skipUnknownRefs?: boolean
    },
    context?: {result: any, replaced: any, schemaCount: number, rootSubtreeRef: string}
) : JSONSchema4 | JSONSchema6 {
    const subtreeObject = refResolver(subtreeRef);

    if(!subtreeObject) {
        throw new Error(`Could not find ref ${subtreeRef}`);
    }

    const result = ld.cloneDeep(subtreeObject);
    const ctx = context || {
        result: result,
        replaced: {},
        schemaCount: 0,
        rootSubtreeRef: subtreeRef
    };

    traveseSchema(result, (
        schema: any
    ) => {
        if(schema.$ref && typeof(schema.$ref) === 'string') {
            if(ctx.replaced[schema.$ref]) {
                schema.$ref = ctx.replaced[schema.$ref];
            } else if(jsonPaths.jsonPointerStartsWith(schema.$ref, ctx.rootSubtreeRef + '/')) {
                ctx.replaced[schema.$ref] = jsonPaths.jsonPointerStripPrefix(schema.$ref, ctx.rootSubtreeRef);
                schema.$ref = ctx.replaced[schema.$ref];
            } else if(!refResolver(schema.$ref)) {
                // Don't know how to resolve this ref
                if(!options.skipUnknownRefs) {
                    throw new Error(`Can't find ref ${schema.$ref}`);
                }
            } else {
                ctx.result.definitions = ctx.result.definitions || {};

                // Find a name to store this under in 'definitions'.
                const origRef = schema.$ref;
                const jsonPath = jsonPtr.decode(schema.$ref);
                let newRefSuffix : string | undefined = jsonPath.length > 0 ? jsonPath[jsonPath.length - 1] : undefined;
                while(!newRefSuffix || ctx.result.definitions[newRefSuffix]) {
                    newRefSuffix = `schema${ctx.schemaCount++}`;
                }

                // Do the replacement.
                schema.$ref = ctx.replaced[schema.$ref] = `#/definitions/${newRefSuffix}`;
                ctx.result.definitions[newRefSuffix] = extractSchemaPriv(origRef, refResolver, options, ctx);
            }
        }
    });

    return result;
}

/**
 * Extracts a subtree from a JSON document, fixing any "$ref" JSON refs so they
 * now
 *
 * @param document - The document to extract a subtree from.
 * @param subtree - A JSON ref to the subtree to extract, or a child node of `document`.
 * @param [options.resolveRef] - A function which, given a JSON reference, resolves the node
 *   it refers to.
 * @param [options.skipUnknownRefs] - If true, skip any unknown refs instead of
 *   throwing an error.
 * @returns the extracted document.  The returned document is a copy, and shares
 *   no children with the original document.
 */
export function extractSchema(
    document: any,
    subtreeRef: string,
    options: {
        resolveRef?: (ref: string) => any | undefined
        skipUnknownRefs?: boolean
    } = {}
) : JSONSchema4 | JSONSchema6 {
    const refResolver = options.resolveRef || resolveRef.bind(null, document);
    return extractSchemaPriv(subtreeRef, refResolver, options, undefined);
}
