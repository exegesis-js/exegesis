import inferTypes from '../../utils/json-schema-infer-types';
import { arrayToObject, removeSimpleTypes, allowedTypesToMap } from './common';
import { RawStringParameterParser } from './types';

export function getSimpleStringParser(schema: any, explode: boolean): RawStringParameterParser {
    const allowedTypes = removeSimpleTypes(inferTypes(schema));

    if (allowedTypes.length === 1 && allowedTypes[0] === 'string') {
        return simpleStringParser;
    } else if (allowedTypes.length === 1 && allowedTypes[0] === 'array') {
        return simpleArrayParser;
    } else if (
        allowedTypes.includes('string') &&
        allowedTypes.includes('array') &&
        !allowedTypes.includes('object')
    ) {
        return simpleStringArrayParser;
    } else {
        return generateGenericSimpleParser(schema, explode);
    }
}

// This is for the case where the result is only allowed to be a string.
export function simpleStringParser(value: string | undefined): string | string[] | undefined {
    return !value ? value : decodeURIComponent(value);
}

// This is for the case where the result allowed to be a string or an array.
export function simpleArrayParser(value: string | undefined): string[] | undefined {
    return value === undefined || value === null ? value : value.split(',').map(decodeURIComponent);
}

export function simpleStringArrayParser(value: string | undefined): string | string[] | undefined {
    const result = simpleArrayParser(value);
    if (!result) {
        return result;
    } else if (result.length === 0) {
        return '';
    } else if (result.length === 1) {
        return result[0];
    } else {
        return result;
    }
}

export function generateGenericSimpleParser(schema: any, explode: boolean) {
    const allowedTypes = removeSimpleTypes(inferTypes(schema));
    const allowedTypesMap = allowedTypesToMap(allowedTypes);

    return function genericSimplerParser(value: string | undefined): any {
        const result = simpleArrayParser(value);
        if (result === null || result === undefined) {
            return value;
        } else if (result.length === 0 && allowedTypesMap.string) {
            return '';
        } else if (result.length === 1 && allowedTypesMap.string) {
            return result[0];
        } else if (allowedTypesMap.array) {
            return result;
        } else if (!explode) {
            // Has to be object
            return arrayToObject(result);
        } else {
            // Exploded object
            return result.reduce((object: any, pair: string) => {
                const [k, v] = pair.split('=');
                object[decodeURIComponent(k)] = decodeURIComponent(v);
                return object;
            }, {});
        }
    };
}
