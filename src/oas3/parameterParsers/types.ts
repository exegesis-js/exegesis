import { ParametersMap, ParameterLocation, StringParser } from '../../types';

/**
 * A descriptor for a parameter that has a "style".
 */
export interface StyledParameterDescriptor {
    style: string;
    explode: boolean;
    schema: any;
    required?: boolean;
    allowReserved?: boolean;
}

/**
 * A descriptor for a parameter that has a content type associated with it.
 * This could be, for example, a Parameter Object with a `content`, or an
 * Encoding Object with a `contentType`.
 */
export interface MediaTypeParameterDescriptor {
    contentType: string;
    schema?: any;
    parser: StringParser;
    required?: boolean;
    uriEncoded?: boolean;
}

export type ParameterDescriptor = StyledParameterDescriptor | MediaTypeParameterDescriptor;

/**
 * A dictionary where names are parameter names, and values are unparsed strings
 * (or arrays of strings for "exploded" parameters, where a parameter appears
 * multiple times in a query string, or there are multiple headers with the
 * given name.)
 *
 * When coming from a path or a query string, strings may contain pct-encoded
 * characters.
 */
export type RawValues = ParametersMap<string | string[] | undefined>;

/**
 * A parameter parser that takes in a string and returns a value.
 */
export interface RawStringParameterParser {
    (value: string | undefined): any;
}

/**
 * A parameter parser that takes in a RawValues dictionary and produces a
 * result.  Generally `ParameterParser` will operation on
 * `rawParamValues[location.name]`.
 */
export interface ParameterParser {
    (
        location: ParameterLocation,
        rawParamValues: RawValues,
        rawValue: string,
        parserContext: any
    ): any;
}
