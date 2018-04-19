import { ValidationError } from "../../errors";
import { ErrorType, ParameterLocation } from "../../types/validation";

export function arrayToObject(values: string | string[], loc: ParameterLocation) {
    const result : any = {};
    if(typeof values === 'string' || values instanceof String) {
        throw new ValidationError({
            type: ErrorType.Error,
            message: `Parameter ${loc.name} in ${loc.in} should encode an object, but is not a list.`,
            location: loc
        });
    }
    if(values.length % 2 !== 0) {
        throw new ValidationError({
            type: ErrorType.Error,
            message: `Parameter ${loc.name} in ${loc.in} should encode an object, but has odd number of fields.`,
            location: loc
        });
    }
    for(let i = 0; i < values.length; i = i + 2) {
        result[values[i]] = values[i+1];
    }
    return result;
}

export function isArrayValidationError(values: string | string[], loc: ParameterLocation) : ValidationError {
    throw new ValidationError({
        type: ErrorType.Error,
        message: `Expected single ${loc.in} for parameter ${loc.name} but found ${values.length}`,
        location: loc
    });
}