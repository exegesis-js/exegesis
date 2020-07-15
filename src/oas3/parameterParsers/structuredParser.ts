import ld from 'lodash';

import { ParameterParser, RawValues } from './types';
import { removeSimpleTypes, allowedTypesToMap } from './common';
import inferTypes from '../../utils/json-schema-infer-types';
import {
    simpleStringParser,
    simpleArrayParser,
    generateGenericSimpleParser,
} from './simpleStringParser';
import { ParameterLocation } from '../../types';

/**
 * A structured parser is a parser that handles RFC6570 path-style and
 * form-style query expansions.
 *
 * @param schema - The JSON Schema this parser is expecting.
 * @param explode - True if this is a parser for an "exploded" expansion.
 */
export function generateStructuredParser(schema: any, explode: boolean): ParameterParser {
    const allowedTypes = removeSimpleTypes(inferTypes(schema));

    if (allowedTypes.length === 1 && allowedTypes[0] === 'string') {
        return structuredStringParser;
    } else if (allowedTypes.length === 1 && allowedTypes[0] === 'array') {
        if (explode) {
            return explodedStructuredArrayParser;
        } else {
            return structuredArrayParser;
        }
    } else if (!explode) {
        return generateGenericStructuredParser(schema);
    } else {
        return generateGenericExplodedStructuredParser(schema);
    }
}

export function structuredStringParser(
    location: ParameterLocation,
    rawParamValues: RawValues
): string | string[] | undefined {
    const value = rawParamValues[location.name];
    if (!value) {
        return value;
    } else if (Array.isArray(value)) {
        // This is supposed to be a string.  -_-
        return value.map(decodeURIComponent);
    } else {
        return value ? simpleStringParser(value) : value;
    }
}

export function structuredArrayParser(
    location: ParameterLocation,
    rawParamValues: RawValues
): string | string[] | undefined {
    const value = rawParamValues[location.name];
    if (value === undefined || value === null) {
        return value;
    } else if (Array.isArray(value)) {
        // We *should* not receive multiple form headers.  If this happens,
        // it's probably because the client used explode when they shouldn't
        // have.
        return explodedStructuredArrayParser(location, rawParamValues);
    } else {
        return value ? simpleArrayParser(value) : value;
    }
}

export function explodedStructuredArrayParser(
    location: ParameterLocation,
    rawParamValues: RawValues
): string | string[] | undefined {
    const value = rawParamValues[location.name];
    if (value === undefined || value === null) {
        return value;
    } else if (Array.isArray(value)) {
        return value.map(decodeURIComponent);
    } else {
        return [decodeURIComponent(value)];
    }
}

function generateGenericStructuredParser(schema: any): ParameterParser {
    const genericSimpleParser = generateGenericSimpleParser(schema, false);

    return function genericStructuredParser(
        location: ParameterLocation,
        rawParamValues: RawValues
    ): any {
        const value = rawParamValues[location.name];
        if (value === undefined || value === null) {
            return value;
        }
        if (Array.isArray(value)) {
            // Unexploded parameters should not be an array.  Parse each member
            // of the array, and return an array of arrays?
            return value.map(genericSimpleParser);
        }
        return genericSimpleParser(value);
    };
}

function explodedKeysStructuredParser(values: RawValues) {
    return ld.mapValues(values, (v) => {
        if (Array.isArray(v)) {
            return v.map(decodeURIComponent);
        } else if (v) {
            return decodeURIComponent(v);
        } else {
            return v;
        }
    });
}

function generateGenericExplodedStructuredParser(schema: any) {
    const allowedTypes = removeSimpleTypes(inferTypes(schema));
    const allowedTypesMap = allowedTypesToMap(allowedTypes);

    return function genericStructuredParser(
        location: ParameterLocation,
        rawParamValues: RawValues
    ): any {
        const value = rawParamValues[location.name];
        if (value === undefined || value === null) {
            if (allowedTypesMap.object) {
                // TODO: Could use a list of allowed parameters to control what we return here.
                return explodedKeysStructuredParser(rawParamValues);
            } else {
                return value;
            }
        }

        // We have a parameter with the same name as the one we're looking for - probably not an object.
        if (Array.isArray(value)) {
            if (!allowedTypesMap.array) {
                return explodedKeysStructuredParser(rawParamValues);
            } else {
                return value.map(simpleStringParser);
            }
        } else if (allowedTypesMap.string) {
            return simpleStringParser(value);
        } else if (allowedTypesMap.array) {
            return [simpleStringParser(value)];
        } else {
            return explodedKeysStructuredParser(rawParamValues);
        }
    };
}
