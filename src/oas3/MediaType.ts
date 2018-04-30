import * as oas3 from 'openapi3-ts';

import { ValidatorFunction, ParameterLocation } from '../types';
import { generateRequestValidator } from './Schema/validators';
import Oas3CompileContext from './Oas3CompileContext';

export default class MediaType<T> {
    readonly context: Oas3CompileContext;
    readonly oaMediaType: oas3.MediaTypeObject;
    readonly parser: T;
    readonly validator: ValidatorFunction;

    constructor(
        context : Oas3CompileContext,
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