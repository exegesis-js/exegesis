// Implements 'spaceDelimited' and 'pipeDelimited' from OAS 3.

import { RawValues } from './types';
import * as exegesisTypes from '../../types';

export function generateDelimitedParser(delimiter: string) {
    return function delimitedParser(
        location: exegesisTypes.ParameterLocation,
        rawParamValues: RawValues
    ): string[] | undefined {
        const value = rawParamValues[location.name];
        if (value === null || value === undefined) {
            return value;
        } else if (Array.isArray(value)) {
            // Client is supposed to send us a delimited string, but it looks
            // like they sent us multiple copies of the var instead.  Just
            // decode the array.
            return value.map(decodeURIComponent);
        } else {
            return decodeURIComponent(value).split(delimiter);
        }
    };
}

export const pipeDelimitedParser = generateDelimitedParser('|');
export const spaceDelimitedParser = generateDelimitedParser(' ');
