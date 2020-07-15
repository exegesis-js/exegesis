import { resolveRef } from './json-schema-resolve-ref';
import { JSONSchema4, JSONSchema6 } from 'json-schema';

const VALID_SCHEMA_TYPES = ['null', 'boolean', 'object', 'array', 'number', 'string', 'integer'];

const ALL_ALLOWED_TYPES = new Set(VALID_SCHEMA_TYPES);
const NO_ALLOWED_TYPES = new Set<string>([]);

function getType(val: any): string {
    if (val === null || val === undefined) {
        return 'null';
    } else if (typeof val === 'string') {
        return 'string';
    } else if (val === true || val === false) {
        return 'boolean';
    } else if (Array.isArray(val)) {
        return 'array';
    } else if (Number.isInteger(val)) {
        return 'integer';
    } else if (typeof val === 'number' && !isNaN(val)) {
        return 'number';
    } else if (typeof val === 'object') {
        return 'object';
    } else {
        throw new Error(`Can't work out JSON-Schema type of ${val}`);
    }
}

function toArray(val: string | string[]) {
    if (Array.isArray(val)) {
        return val;
    } else {
        return [val];
    }
}

function union<T>(a: Set<T>, b: Set<T>) {
    return new Set<T>([...a, ...b]);
}

function intersection<T>(a: Set<T>, b: Set<T>) {
    return new Set<T>([...a].filter((x) => b.has(x)));
}

function inferTypesOneOf(rootSchema: any, oneOf: any[], stack: any[]): Set<string> {
    if (oneOf.length === 0) {
        return ALL_ALLOWED_TYPES;
    }

    let allowedTypes = NO_ALLOWED_TYPES;
    oneOf.forEach((childSchema: any) => {
        childSchema = resolveRef(rootSchema, childSchema);
        const types = inferTypesPriv(rootSchema, childSchema, stack);
        allowedTypes = union(allowedTypes, types);
    });

    return allowedTypes;
}

function inferTypesPriv(
    rootSchema: any,
    schema: JSONSchema4 | JSONSchema6,
    stack: any[]
): Set<string> {
    if (stack.includes(schema)) {
        throw new Error('circular definition found');
    } else {
        stack = stack.concat(schema);
    }

    let allowedTypes = ALL_ALLOWED_TYPES;

    allowedTypes = intersection(
        allowedTypes,
        inferTypesOneOf(rootSchema, schema.oneOf || [], stack)
    );
    allowedTypes = intersection(
        allowedTypes,
        inferTypesOneOf(rootSchema, schema.anyOf || [], stack)
    );

    if (schema.type) {
        allowedTypes = intersection(allowedTypes, new Set(toArray(schema.type)));
    }

    if (schema.allOf) {
        for (const childSchemaRef of schema.allOf) {
            const childSchema = resolveRef(rootSchema, childSchemaRef);
            const types = inferTypesPriv(rootSchema, childSchema, stack);
            allowedTypes = intersection(allowedTypes, types);
        }
    }

    // TODO: Dealing with "not" is hard.

    if ('const' in schema) {
        const schemaConst = (schema as JSONSchema6).const;
        const constType = new Set<string>([getType(schemaConst)]);
        allowedTypes = intersection(allowedTypes, constType);
    }

    if (schema.enum) {
        const enumTypes = new Set<string>(schema.enum.map(getType));
        allowedTypes = intersection(allowedTypes, enumTypes);
    }

    return allowedTypes;
}

/**
 * Given a JSON Schema, returns a list of types that an object which passes
 * schema validation would be allowed to have.
 *
 * @param schema - A JSON schema.  This is allowed to have `$ref`s, but they
 *   must be internal refs relative to the schema (or to the `rootDocument`
 *   if it is specified).
 * @param [options.rootDocument] - If your JSON schema is embedded in a larger
 *   JSON document, it can be provided here to resolve `$ref`s relative to that
 *   parent document.
 */
export default function inferTypes(
    schema: JSONSchema4 | JSONSchema6,
    options: {
        rootDocument?: any;
    } = {}
): string[] {
    let result = inferTypesPriv(options.rootDocument || schema, schema, []);

    // Number includes integer, so if number is set, then integer needs to be as well.
    if (result.has('number')) {
        result = new Set(result);
        result.add('integer');
    }

    return Array.from(result);
}
