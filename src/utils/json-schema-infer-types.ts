import {resolveRef} from './json-schema-resolve-ref';

const INT_REGEX = /^[0-9]+$/;
const VALID_SCHEMA_TYPES = ['null', 'boolean', 'object', 'array', 'number', 'string', 'integer'];

interface TypeSet {
    [key: string]: boolean; // Keys are from VALID_SCHEMA_TYPES.
}

const ALL_ALLOWED_TYPES : TypeSet = typesToSet(VALID_SCHEMA_TYPES);
const NO_ALLOWED_TYPES : TypeSet = typesToSet([]);
const OBJECT_OR_ARRAY : TypeSet = typesToSet(['object', 'array']);
const OBJECT_TYPE : TypeSet = typesToSet('object');

function typeToArray(type: string | string[]) : string[] {
    return Array.isArray(type) ? type : [type];
}

function typesToSet(type: string | string[]) : TypeSet {
    const types = typeToArray(type);
    return VALID_SCHEMA_TYPES.reduce<TypeSet>(
        (result: TypeSet, t: string) : TypeSet => {
            result[t] = types.indexOf(t) > -1;
            return result;
        },
        {}
    );
}

function intersection(allowedTypes1: TypeSet, allowedTypes2: TypeSet): TypeSet {
    return VALID_SCHEMA_TYPES.reduce<TypeSet>((result: TypeSet, t: string) => {
        result[t] = allowedTypes1[t] && allowedTypes2[t];
        return result;
    }, {});
}

function union(allowedTypes1: TypeSet, allowedTypes2: TypeSet): TypeSet {
    return VALID_SCHEMA_TYPES.reduce<TypeSet>((result: TypeSet, t: string) => {
        result[t] = allowedTypes1[t] || allowedTypes2[t];
        return result;
    }, {});
}

function inferTypesOneOf(rootSchema: any, oneOf: any[], stack: any[]): TypeSet {
    if(oneOf.length === 0) {
        return ALL_ALLOWED_TYPES;
    }

    let allowedTypes: TypeSet = NO_ALLOWED_TYPES;
    oneOf.forEach((childSchema: any) => {
        childSchema = resolveRef(rootSchema, childSchema);
        const types = inferTypesPriv(rootSchema, childSchema, stack);
        allowedTypes = union(allowedTypes, types);
    });

    return allowedTypes;
}

function inferTypesPriv(rootSchema: any, schema: any, stack: any[]): TypeSet {
    if(stack.indexOf(schema) > -1) {
        throw new Error("circular definition found");
    } else {
        stack = stack.concat(schema);
    }

    let allowedTypes: TypeSet = ALL_ALLOWED_TYPES;

    allowedTypes = intersection(allowedTypes, inferTypesOneOf(rootSchema, schema.oneOf || [], stack));
    allowedTypes = intersection(allowedTypes, inferTypesOneOf(rootSchema, schema.anyOf || [], stack));

    if(schema.type) {
        allowedTypes = intersection(allowedTypes, typesToSet(schema.type));
    }

    if(schema.allOf) {
        schema.allOf.forEach((childSchema: any) => {
            childSchema = resolveRef(rootSchema, childSchema);
            const types = inferTypesPriv(rootSchema, childSchema, stack);
            allowedTypes = intersection(allowedTypes, types);
        });
    }

    if(schema.minProperties && schema.minProperties > 0) {
        allowedTypes = intersection(allowedTypes, OBJECT_OR_ARRAY);
    }

    const propertyNames = Object.keys(schema.properties || {});
    if(propertyNames.length > 0) {
        const numeric = propertyNames.every((name: string) => !!INT_REGEX.exec(name));
        if(numeric) {
            allowedTypes = intersection(allowedTypes, OBJECT_OR_ARRAY);
        } else {
            allowedTypes = intersection(allowedTypes, OBJECT_TYPE);
        }
    }

    return allowedTypes;
}

/**
 * Given a JSON Schema, returns a list of types that an object which passes
 * schema validation would be allowed to have.
 *
 * @param schema - A JSON schema.
 */
export default function inferTypes(schema : any) : string[] {
    // FIXME: Allow for $refs.
    const result = inferTypesPriv(schema, schema, []);

    // Number includes integer, so if number is set, then integer needs to be as well.
    if(result.number) {
        result.integer = true;
    }

    return Object.keys(result).filter(k => result[k]);
}
