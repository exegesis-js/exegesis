import { ParametersMap, ParameterLocation, StringParser } from "../../types";

export interface StyledParameterDescriptor {
    style: string;
    explode: boolean;
    schema: any;
    required?: boolean;
    allowReserved?: boolean;
}

export interface MediaTypeParameterDescriptor {
    contentType: string;
    parser: StringParser;
    required?: boolean;
    uriEncoded?: boolean;
}

export type ParameterDescriptor = StyledParameterDescriptor | MediaTypeParameterDescriptor;

export type ValuesBag = ParametersMap<string | string[] | undefined>;

export interface RawStringParameterParser {
    (value: string | undefined) : any;
}

export interface ParameterParser {
    (location: ParameterLocation, rawParamValues: ValuesBag, rawValue: string, parserContext: any) : any;
}