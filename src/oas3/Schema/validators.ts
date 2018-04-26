import Ajv from 'ajv';
import traveseSchema from 'json-schema-traverse';

import * as jsonPaths from '../../utils/jsonPaths';
import * as jsonSchema from '../../utils/jsonSchema';
import { resolveRef } from '../../utils/json-schema-resolve-ref';
import Oas3Context from '../Oas3Context';

import { CustomFormats, ValidatorFunction, IValidationError, ErrorType } from '../../types';

// TODO tests
// * nullable
// * readOnly
// * readOnly with additionalProperties and value supplied
// * readOnly not supplied but required
// * writeOnly (all cases as readOnly)
// * Make sure validation errors are correct format.

function addCustomFormats(ajv: Ajv.Ajv, customFormats: CustomFormats) : {[k: string]: Ajv.FormatDefinition} {
    return Object.keys(customFormats)
        .reduce<{[k: string]: Ajv.FormatDefinition}>((
            // TODO: Hack for https://github.com/epoberezkin/ajv/pull/761:
            //
            // result: {[k: string]: Ajv.FormatDefinition},
            result: {[k: string]: any},
            key: string
        ) => {
            const customFormat = customFormats[key];
            if(typeof customFormat === 'function' || customFormat instanceof RegExp) {
                result[key] = {type: 'string', validate: customFormat};
            } else if(customFormat.type === 'string') {
                result[key] = {type: 'string', validate: customFormat.validate};
            } else if(customFormat.type === 'number') {
                result[key] = {type: 'number', validate: customFormat.validate};
            }

            ajv.addFormat(key, result[key]);
            return result;
        }, {});
}

function removeExamples(schema: any) {
    // ajv will print "schema id ignored" to stdout if an example contains a filed
    // named "id", so just axe all the examples.
    traveseSchema(schema, (childSchema: any) => {
        if(childSchema.example) {
            delete childSchema.example;
        }
    });
}

export function _fixNullables(schema: any) {
    traveseSchema(schema, (childSchema: any) => {
        if(schema.properties) {
            for(const propName of Object.keys(childSchema.properties)) {
                const prop = childSchema.properties[propName];
                const resolvedProp = resolveRef(schema, prop);
                if(resolvedProp.nullable) {
                    childSchema.properties[propName] = {anyOf: [{type: 'null'}, prop]};
                }
            }
        }
        if(childSchema.additionalProperties) {
            const resolvedProp = resolveRef(schema, childSchema.additionalProperties);
            if(resolvedProp.nullable) {
                childSchema.additionalProperties = {anyOf: [{type: 'null'}, childSchema.additionalProperties]};
            }
        }
        if(childSchema.items) {
            const resolvedItems = resolveRef(schema, childSchema.items);
            if(resolvedItems.nullable) {
                childSchema.items = {anyOf: [{type: 'null'}, childSchema.items]};
            }
        }
    });
}

export function _filterRequiredProperties(schema: any, propNameToFilter: string) {
    traveseSchema(schema, (childSchema: any) => {
        if(childSchema.properties && schema.required) {
            for(const propName of Object.keys(childSchema.properties)) {
                const prop = childSchema.properties[propName];
                const resolvedProp = resolveRef(schema, prop);
                if(resolvedProp[propNameToFilter]) {
                    schema.required = schema.required.filter((r: string) => r !== propName);
                }
            }
        }
    });
}

function generateValidator(
    schemaContext: Oas3Context,
    parameterIn: string,
    parameterName: string,
    parameterRequired: boolean,
    propNameToFilter: string
) : ValidatorFunction {
    const {openApiDoc, path: schemaPath} = schemaContext;
    const customFormats = schemaContext.options.customFormats;

    const schema: any = jsonSchema.extractSchema(openApiDoc, jsonPaths.pathToJsonPointer(schemaPath));
    _filterRequiredProperties(schema, propNameToFilter);
    removeExamples(schema);
    // TODO: Should we do this?  Or should we rely on the schema being correct in the first place?
    // _fixNullables(schema);

    const ajv = new Ajv({
        coerceTypes: 'array',
        removeAdditional: 'failing',
        jsonPointers: true
    });
    addCustomFormats(ajv, customFormats);
    const validate = ajv.compile(schema);

    return function(json: any) {
        if(json === null || json === undefined) {
            if(parameterRequired) {
                return [{
                    type: ErrorType.Error,
                    message: `Missing required ${parameterIn}:${parameterName}`,
                    location: {
                        in: parameterIn,
                        name: parameterName,
                        docPath: schemaPath,
                        path: []
                    }
                }];
            } else {
                return null;
            }
        }

        validate(json);
        if(validate.errors) {
            const validationErrors : IValidationError[] = validate.errors.map(err => ({
                type: ErrorType.Error,
                message: err.message || 'Unspecified error',
                location: {
                    in: parameterIn,
                    name: parameterName,
                    docPath: schemaPath,
                    path: err.dataPath ? jsonPaths.jsonPointerToPath(err.dataPath) : []
                }
            }));
            return validationErrors;
        }

        return null;
    };
}

export function generateRequestValidator(
    schemaContext: Oas3Context,
    parameterIn: string,
    parameterName: string,
    parameterRequired: boolean
) : ValidatorFunction {
    return generateValidator(schemaContext, parameterIn, parameterName, parameterRequired, 'readOnly');
}

export function generateResponseValidator(
    schemaContext: Oas3Context,
    parameterIn: string,
    parameterName: string,
    parameterRequired: boolean
) : ValidatorFunction {
    return generateValidator(schemaContext, parameterIn, parameterName, parameterRequired, 'writeOnly');
}
