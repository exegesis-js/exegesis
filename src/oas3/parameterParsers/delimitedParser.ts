// Implements 'spaceDelimited' and 'pipeDelimited' from OAS 3.

import { RawParameterParser, ValuesBag } from '.';
import { ParameterLocation } from '../../types/validation';
import { arrayToObject } from './common';

export function generateDelimitedParser(
    parameterLocation: ParameterLocation,
    isKeys: boolean,
    delimiter: string
) : RawParameterParser {
    let parserFn: (value: string, delimiter: string, loc: ParameterLocation) => any;
    const name = parameterLocation.name;

    if(!isKeys) {
        parserFn = delimitedParser;
    } else {
        parserFn = delimitedKeysParser;
    }

    return (values: ValuesBag) => {
        const value = values[name];
        if(!value) {
            return undefined;
        } else if(Array.isArray(value)) {
            // Client sent us something like ?var=1&var=2 instead of ?var=1|2.
            // Assume this is already parsed.
            return value.map(decodeURIComponent);
        } else {
            return parserFn(value, delimiter, parameterLocation);
        }
    };
}

export function delimitedParser(value: string, delimiter: string) : string[] {
    return decodeURIComponent(value).split(delimiter);
}

export function delimitedKeysParser(value: string, delimiter: string, loc: ParameterLocation) : any {
    const arr = delimitedParser(value, delimiter);
    return arrayToObject(arr, loc);
}
