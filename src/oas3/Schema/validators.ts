import Ajv, { ValidateFunction } from 'ajv';
import traveseSchema from 'json-schema-traverse';
import { CustomFormats, IValidationError, ParameterLocation, ValidatorFunction } from '../../types';
import { resolveRef } from '../../utils/json-schema-resolve-ref';
import * as jsonPaths from '../../utils/jsonPaths';
import * as jsonSchema from '../../utils/jsonSchema';
import { MimeTypeRegistry } from '../../utils/mime';
import Oas3CompileContext from '../Oas3CompileContext';

// urlencoded and form-data requests do not contain any type information;
// for example `?foo=9` doesn't tell us if `foo` is the number 9, or the string
// "9", so we need to use type coercion to make sure the data passed in matches
// our schema.
const REQUEST_TYPE_COERCION_ALLOWED = new MimeTypeRegistry<boolean>({
    'application/x-www-form-urlencoded': true,
    'multipart/form-data': true,
});

// TODO tests
// * readOnly
// * readOnly with additionalProperties and value supplied
// * readOnly not supplied but required
// * writeOnly (all cases as readOnly)
// * Make sure validation errors are correct format.

function assertNever(x: never): never {
    throw new Error('Unexpected object: ' + x);
}

function getParameterDescription(parameterLocation: ParameterLocation) {
    let description = '';
    switch (parameterLocation.in) {
        case 'path':
        case 'server':
        case 'query':
        case 'cookie':
        case 'header':
            description = `${parameterLocation.in} parameter "${parameterLocation.name}"`;
            break;
        case 'request':
        case 'response':
            description = `${parameterLocation.in} body`;
            break;
        default:
            assertNever(parameterLocation.in);
    }

    return description;
}

function addCustomFormats(ajv: Ajv, customFormats: CustomFormats) {
    for (const key of Object.keys(customFormats)) {
        ajv.addFormat(key, customFormats[key]);
    }
}

function removeExamples(schema: any) {
    // ajv will print "schema id ignored" to stdout if an example contains a filed
    // named "id", so just axe all the examples.
    traveseSchema(schema, (childSchema: any) => {
        if (childSchema.example) {
            delete childSchema.example;
        }
    });
}

export function _fixNullables(schema: any) {
    traveseSchema(schema, {
        cb: {
            post: (
                childSchema: any,
                _jsonPtr,
                rootSchema: any,
                _parentJsonPtr,
                parentKeyword,
                _parentSchema,
                keyIndex
            ) => {
                if (childSchema.nullable) {
                    let ref = rootSchema;
                    let key = parentKeyword;
                    if (key && keyIndex) {
                        ref = ref[key];
                        key = `${keyIndex}`;
                    }
                    if (ref && key) {
                        ref[key] = {
                            anyOf: [{ type: 'null' }, childSchema],
                        };
                    } else if (childSchema === schema) {
                        schema = {
                            anyOf: [{ type: 'null' }, schema],
                        };
                    }
                }
            },
        },
    });

    return schema;
}

export function _filterRequiredProperties(schema: any, propNameToFilter: string) {
    traveseSchema(schema, (childSchema: any) => {
        if (childSchema.properties && childSchema.required) {
            for (const propName of Object.keys(childSchema.properties)) {
                const prop = childSchema.properties[propName];

                // Resolve the prop, in case it's a `{$ref: ....}`.
                const resolvedProp = resolveRef(schema, prop);

                if (resolvedProp && resolvedProp[propNameToFilter]) {
                    childSchema.required = childSchema.required.filter(
                        (r: string) => r !== propName
                    );
                }
            }
        }
    });
}

function doValidate(
    schemaPtr: string,
    parameterLocation: ParameterLocation,
    parameterRequired: boolean,
    ajvValidate: ValidateFunction,
    json: any
) {
    const value = { value: json };
    let errors: IValidationError[] | null = null;

    if (json === null || json === undefined) {
        if (parameterRequired) {
            errors = [
                {
                    message: `Missing required ${getParameterDescription(parameterLocation)}`,
                    location: {
                        in: parameterLocation.in,
                        name: parameterLocation.name,
                        // docPath comes from parameter here, not schema, since the parameter
                        // is the one that defines it is required.
                        docPath: parameterLocation.docPath,
                        path: '',
                    },
                },
            ];
        }
    }

    if (!errors) {
        ajvValidate(value);
        if (ajvValidate.errors) {
            errors = ajvValidate.errors.map((err) => {
                let pathPtr = err.instancePath || '';
                if (pathPtr.startsWith('/value')) {
                    pathPtr = pathPtr.slice(6);
                }

                return {
                    message: err.message || 'Unspecified error',
                    location: {
                        in: parameterLocation.in,
                        name: parameterLocation.name,
                        docPath: schemaPtr,
                        path: pathPtr,
                    },
                    ajvError: err,
                };
            });
        }
    }

    return { errors, value: value.value };
}

function generateValidator(
    schemaContext: Oas3CompileContext,
    parameterLocation: ParameterLocation,
    parameterRequired: boolean,
    propNameToFilter: string,
    allowTypeCoercion: boolean
): ValidatorFunction {
    const { openApiDoc, jsonPointer: schemaPtr } = schemaContext;
    const customFormats = schemaContext.options.customFormats;

    let schema: any = jsonSchema.extractSchema(openApiDoc, schemaPtr);
    _filterRequiredProperties(schema, propNameToFilter);
    removeExamples(schema);
    // TODO: Should we do this?  Or should we rely on the schema being correct in the first place?
    // schema = _fixNullables(schema);

    // So that we can replace the "root" value of the schema using ajv's type coercion...
    traveseSchema(schema, (node: any) => {
        if (node.$ref) {
            if (node.$ref.startsWith('#')) {
                node.$ref = `#/properties/value/${node.$ref.slice(2)}`;
            } else {
                node.$ref = jsonPaths.toUriFragment(`/properties/value/${node.$ref.slice(1)}`);
            }
        }
    });
    schema = {
        type: 'object',
        properties: {
            value: schema,
        },
    };

    const ajv = new Ajv({
        useDefaults: true,
        coerceTypes: allowTypeCoercion ? 'array' : false,
        removeAdditional: allowTypeCoercion ? 'failing' : false,
        allErrors: schemaContext.options.allErrors,
    });

    addCustomFormats(ajv, customFormats);
    const validate = ajv.compile(schema);

    return function (json: any) {
        return doValidate(schemaPtr, parameterLocation, parameterRequired, validate, json);
    };
}

export function generateRequestValidator(
    schemaContext: Oas3CompileContext,
    parameterLocation: ParameterLocation,
    parameterRequired: boolean,
    mediaType: string
): ValidatorFunction {
    const allowTypeCoercion = mediaType
        ? REQUEST_TYPE_COERCION_ALLOWED.get(mediaType) || false
        : false;
    return generateValidator(
        schemaContext,
        parameterLocation,
        parameterRequired,
        'readOnly',
        allowTypeCoercion
    );
}

export function generateResponseValidator(
    schemaContext: Oas3CompileContext,
    parameterLocation: ParameterLocation,
    parameterRequired: boolean
): ValidatorFunction {
    return generateValidator(
        schemaContext,
        parameterLocation,
        parameterRequired,
        'writeOnly',
        false
    );
}
