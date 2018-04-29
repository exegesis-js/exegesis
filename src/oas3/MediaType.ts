import * as oas3 from 'openapi3-ts';

import { ValidatorFunction, ParameterLocation } from '../types';
import { generateRequestValidator } from './Schema/validators';
import Oas3Context from './Oas3Context';

export default class MediaType<T> {
    readonly context: Oas3Context;
    readonly oaMediaType: oas3.MediaTypeObject;
    readonly parser: T;
    readonly validator: ValidatorFunction;

    constructor(
        context : Oas3Context,
        oaMediaType: oas3.MediaTypeObject,
        parameterLocation: ParameterLocation,
        parameterRequired: boolean,
        parser: T
    ) {
        this.context = context;
        this.oaMediaType = oaMediaType;
        this.parser = parser;

        if(oaMediaType.schema) {
            const schemaContext = context.childContext('schema');
            this.validator = generateRequestValidator(schemaContext, parameterLocation, parameterRequired);
        } else {
            this.validator = () => null;
        }
    }
}