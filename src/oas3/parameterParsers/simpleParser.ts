import { ParameterParser, ValuesBag } from '.';
import { ParameterLocation } from '../../types/validation';
import { arrayToObject, isArrayValidationError } from './common';

// TODO: Replace `isKeys` with `allowedTypes`?
export function generateSimpleParser(
    parameterLocation: ParameterLocation,
    isKeys: boolean,
    explode: boolean
) : ParameterParser {
    let parserFn: (value: string, parameterLocation: ParameterLocation) => any;
    const name = parameterLocation.name;

    if(!isKeys) {
        parserFn = simpleParser;
    } else if(!explode) {
        parserFn = simpleKeysParser;
    } else {
        parserFn = simpleExplodedKeysParser;
    }

    return (values: ValuesBag) => {
        const value = values[name];
        if(value === null || value === undefined) {
            return undefined;
        } else if(Array.isArray(value)) {
            throw isArrayValidationError(value, parameterLocation);
        } else {
            return parserFn(value, parameterLocation);
        }
    };
}

export function simpleParser(value: string) : string | string[] {
    if(!value) {
        return '';
    } else {
        const result = value.split(',').map(decodeURIComponent);
        return (result.length === 1) ? result[0] : result;
    }
}

export function simpleKeysParser(value: string, loc: ParameterLocation) : any {
    const arr = simpleParser(value);
    return arrayToObject(arr, loc);
}

export function simpleExplodedKeysParser(value: string) : any {
    const arr = value.split(',');
    return arr.reduce(
        (object: any, pair: string) => {
            const [k, v] = pair.split('=');
            object[decodeURIComponent(k)] = decodeURIComponent(v);
            return object;
        },
        {}
    );
}
