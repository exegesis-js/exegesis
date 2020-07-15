import querystring from 'querystring';

import { ParameterParser, RawValues } from './types';
import { generateStructuredParser } from './structuredParser';
import { ParameterLocation } from '../../types';

function parsePathParameter(
    location: ParameterLocation,
    value: string,
    structuredParser: ParameterParser
) {
    if (value.startsWith(';')) {
        value = value.slice(1);
    }
    const queryParsedValue = querystring.parse(value, ';', '=', {
        decodeURIComponent: (val: string) => val,
    });
    return structuredParser(location, queryParsedValue, value, {});
}

export function generatePathStyleParser(schema: any, explode: boolean): ParameterParser {
    const structuredParser = generateStructuredParser(schema, explode);

    return function pathStyleParser(location: ParameterLocation, rawParamValues: RawValues): any {
        const value = rawParamValues[location.name];
        let answer;
        if (value === null || value === undefined) {
            answer = value;
        } else if (Array.isArray(value)) {
            // This will never happen, since "matrix" parameters are only
            // allowed in the path, and no one is going to define some
            // crazy path like "/foo/{bar}/{bar}".
            answer = value.map((v) => parsePathParameter(location, v, structuredParser));
        } else {
            answer = parsePathParameter(location, value, structuredParser);
        }

        return answer;
    };
}
