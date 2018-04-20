import ld from 'lodash';
import { ParameterLocation } from "../../types/validation";

import { ParserContext } from './ParserContext';
import { generateSimpleParser } from './simpleParser';
import { generateFormStyleQueryParser } from './formParser';
import { generatePathStyleParser } from './pathParser';
import { generateDelimitedParser } from './delimitedParser';
import { ParametersMap } from '../../types/ApiInterface';

export type ValuesBag = ParametersMap<string | string[] | undefined>;

export interface RawParameterParser {
    (values: ValuesBag, parserContext: ParserContext) : any;
}

function arrayCoercion(parser: RawParameterParser) : RawParameterParser {
    return (values: ValuesBag, parserContext: ParserContext) => {
        const result = parser(values, parserContext);
        if(result === undefined) {return undefined;}
        return Array.isArray(result) ? result : [result];
    };
}

export function getParser(
    parameterLocation: ParameterLocation,
    style: string,
    allowedTypes: string[],
    options: {
        explode?: boolean,
        allowReserved?: boolean
    }={}
) : RawParameterParser {
    const explode = options.explode || false;
    const isKeys = ld.includes(allowedTypes, 'object');
    const isArray = ld.includes(allowedTypes, 'array');
    if(isKeys && isArray) {
        throw new Error("Exegesis does not support parameters that can parsed as either an array or an object.");
    }

    let result: RawParameterParser;
    switch(style) {
        case 'simple':
            result = generateSimpleParser(parameterLocation, isKeys, explode);
            break;
        case 'form':
            result = generateFormStyleQueryParser(parameterLocation, isKeys, explode);
            break;
        case 'matrix':
            result = generatePathStyleParser(parameterLocation, isKeys, explode);
            break;
        case 'spaceDelimited':
            result = generateDelimitedParser(parameterLocation, isKeys, ' ');
            break;
        case 'pipeDelimited':
            result = generateDelimitedParser(parameterLocation, isKeys, '|');
            break;
        case 'deepObject':
            if(parameterLocation.in !== 'query' && parameterLocation.in !== 'request') {
                throw new Error("deepObject only valid for query parameters");
            }
            result = generateDeepObjectParser(parameterLocation);
            break;
        default:
            throw new Error(`Unknown parameter style ${style}`);
    }

    if(allowedTypes.length === 1 && allowedTypes[0] === 'array') {
        result = arrayCoercion(result);
    }

    return result;
}

function generateDeepObjectParser(loc: ParameterLocation) : RawParameterParser {
    return function deepObjectParser(_values: ValuesBag, parserContext: ParserContext) {
        return parserContext.qs[loc.name];
    };
}

export function parseParameters(
    params: {
        name: string,
        parser: RawParameterParser
    }[],
    parserContext: ParserContext,
    rawValues: ValuesBag
) : ParametersMap<any> {
    return params.reduce(
        (result: any, {name, parser}) => {
            result[name] = parser(rawValues, parserContext);
            return result;
        },
        {}
    );
}
