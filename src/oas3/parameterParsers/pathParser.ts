import querystring from 'querystring';
import { ParameterParser, ValuesBag } from '.';
import { ParameterLocation } from '../../types/common';
import { isArrayValidationError } from './common';
import { generateFormStyleQueryParser } from './formParser';
import { ParserContext } from './ParserContext';

// Generates a RFC 6570 path-style parser.  This is an OAS3 "matrix" parser.
export function generatePathStyleParser(
    parameterLocation: ParameterLocation,
    isKeys: boolean,
    explode: boolean
) : ParameterParser {
    const parser = generateFormStyleQueryParser(parameterLocation, isKeys, explode);
    return (values: ValuesBag, ctx: ParserContext) : any => {
        const value = values[parameterLocation.name];
        if(value === undefined) {
            return undefined;
        } else if(Array.isArray(value)) {
            throw isArrayValidationError(value, parameterLocation);
        } else {
            const parsedMatrix = parseMatrix(value);
            return parser(parsedMatrix, ctx);
        }
    };
}

function parseMatrix(value: string) : any {
    if(value[0] === ';') {
        value = value.slice(1);
    }
    return querystring.parse(value, ';', '=', {decodeURIComponent: (val: string) => val});
}