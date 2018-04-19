import ld from 'lodash';
import { BodyParser, ParameterBodyParser } from '../../bodyParsers/BodyParser';
import { ValidationError } from "../../errors";
import { ErrorType, ParameterLocation } from "../../types/validation";
import { MimeTypeRegistry } from "../../utils/mime";
import { pathToJsonPointer } from '../../utils/jsonPaths';
import { ParameterBag } from '../types';
import { generateSimpleParser } from './simpleParser';
import { generateFormStyleQueryParser } from './formParser';
import { generatePathStyleParser } from './pathParser';
import { generateDelimitedParser } from './delimitedParser';
import { ParserContext } from './ParserContext';

export interface ParametersParser {
    (
        pathParams: {[parameterName: string]: string | string[]},
        headers: {[parameterName: string]: string | string[]},
        queryString: string
    ) : ParameterBag<{[parameterName: string]: any}>;
}

export interface ValuesBag {
    [parameterName: string]: string | string[] | undefined;
}

export interface ParameterParser {
    (values: ValuesBag, parserContext: ParserContext) : any;
}

function arrayCoercion(parser: ParameterParser) : ParameterParser {
    return (values: ValuesBag, parserContext: ParserContext) => {
        const result = parser(values, parserContext);
        if(result === undefined) {return undefined;}
        return Array.isArray(result) ? result : [result];
    };
}

export function getMimeTypeParser(
    parameterLocation: ParameterLocation,
    mimeType: string,
    parameterParsers: MimeTypeRegistry<ParameterBodyParser>,
    uriEncoded: boolean = false
) : ParameterParser {
    if(mimeType === 'application/x-www-form-urlencoded') {
        // This is a special case in OAS 3; we need to parse the parameter/body
        // according to the 'encoding object'.
        throw new Error("Can't use getMimeTypeParser() for application/x-www-form-urlencoded");
    }

    const bodyParser = parameterParsers.get(mimeType);
    const name = parameterLocation.name;
    if(!bodyParser) {
        throw new Error(`Parameter ${parameterLocation.name} in ${pathToJsonPointer(parameterLocation.docPath)} ` +
            `uses media type ${mimeType}, but no parameter parser is registered for this type.`
        );
    }

    return (values: ValuesBag) : any => {
        try {
            let value = values[name];
            if(!value) {return value;}
            if(uriEncoded) {
                if(Array.isArray(value)) {
                    value = value.map(decodeURIComponent);
                } else {
                    value = decodeURIComponent(value);
                }
            }
            if(Array.isArray(value)) {
                return value.map(bodyParser.parseString);
            } else {
                return bodyParser.parseString(value);
            }
        } catch (err) {
            throw new ValidationError({
                type: ErrorType.Error,
                message: `Error parsing parameter ${name} of type ${mimeType}: ${err.message}`,
                location: parameterLocation
            });
        }
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
) : ParameterParser {
    const explode = options.explode || false;
    const isKeys = ld.includes(allowedTypes, 'object');
    const isArray = ld.includes(allowedTypes, 'array');
    if(isKeys && isArray) {
        throw new Error("Exegesis does not support parameters that can parsed as either an array or an object.");
    }

    let result: ParameterParser;
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
            if(parameterLocation.in !== 'query' && parameterLocation.in !== 'body') {
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

function generateDeepObjectParser(loc: ParameterLocation) : ParameterParser {
    return function deepObjectParser(_values: ValuesBag, parserContext: ParserContext) {
        return parserContext.qs[loc.name];
    };
}