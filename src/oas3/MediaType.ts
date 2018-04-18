import {generateRequestValidator} from './Schema/validators';
import Oas3Context from './Oas3Context';

import * as oas3 from 'openapi3-ts';
import {ValidatorFunction, ParameterLocation} from '../types/common';

export default class MediaType {

    readonly context: Oas3Context;
    readonly oaMediaType: oas3.MediaTypeObject;
    readonly validator: ValidatorFunction;

    constructor(
        context : Oas3Context,
        oaMediaType: oas3.MediaTypeObject,
        location: ParameterLocation
    ) {
        this.context = context;
        this.oaMediaType = oaMediaType;

        if(oaMediaType.schema) {
            const schemaContext = context.childContext('schema');
            this.validator = generateRequestValidator(schemaContext, location);
        } else {
            this.validator = () => null;
        }
    }
}