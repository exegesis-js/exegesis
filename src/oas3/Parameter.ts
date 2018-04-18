import inferTypes from './../utils/json-schema-infer-types';
import {generateRequestValidator} from './Schema/validators';
import { ParameterParser, getMimeTypeParser, getParser } from './parameterParsers';
import Oas3Context from './Oas3Context';

import * as oas3 from 'openapi3-ts';
import { ValidatorFunction, ParameterLocation } from '../types/common';
import { isReferenceObject } from './oasUtils';

const DEFAULT_STYLE : {[style: string]: string} = {
    path: 'simple',
    query: 'form',
    cookie: 'form',
    header: 'simple'
};

function getDefaultExplode(style: string) : boolean {
    return style === 'form';
}

export default class Parameter {
    readonly context: Oas3Context;
    readonly oaParameter: oas3.ParameterObject;

    readonly location: ParameterLocation;
    readonly validate: ValidatorFunction;

    /**
     * Parameter parser used to parse this parameter.
     */
    readonly parser: ParameterParser;

    constructor(context: Oas3Context, oaParameter: oas3.ParameterObject | oas3.ReferenceObject) {
        if(isReferenceObject(oaParameter)) {
            oaParameter = context.resolveRef(oaParameter.$ref) as oas3.ParameterObject;
        }

        this.location = {
            in: oaParameter.in,
            name: oaParameter.name,
            docPath: context.path
        };

        this.context = context;
        this.oaParameter = oaParameter;
        this.validate = () => null;

        // Find the schema for this parameter.
        if(oaParameter.schema) {
            // FIXME: Extract schema?
            const schema = context.resolveRef(oaParameter.schema) as oas3.SchemaObject;
            this.validate = generateRequestValidator(
                context.childContext('schema'),
                oaParameter.in,
                oaParameter.name
            );
            this.parser = this._generateSchemaParser(schema);

        } else if(oaParameter.content) {
            // `parameter.content` must have exactly one key
            // FIXME: Extract schema?
            const mediaTypeString = Object.keys(oaParameter.content)[0];
            const schema = context.resolveRef(oaParameter.content[mediaTypeString].schema) as oas3.SchemaObject;

            if(schema) {
                this.validate = generateRequestValidator(
                    context.childContext(['content', mediaTypeString, 'schema']),
                    oaParameter.in,
                    oaParameter.name
                );
            }
            this.parser = this._generateContentParser(mediaTypeString);

        } else {
            throw new Error(`Parameter ${oaParameter.name} should have a 'schema' or a 'content'`);
        }

    }

    private _generateSchemaParser(schema: oas3.SchemaObject) {
        const style = this.oaParameter.style || DEFAULT_STYLE[this.oaParameter.in];
        const explode = (this.oaParameter.explode === null || this.oaParameter.explode === undefined)
            ? getDefaultExplode(style)
            : this.oaParameter.explode;
        const allowReserved = this.oaParameter.allowReserved || false;
        const allowedTypes = inferTypes(schema);
        return getParser(this.location, style, allowedTypes, {explode, allowReserved});
    }

    private _generateContentParser(mediaType: string) : ParameterParser {
        return getMimeTypeParser(this.location, mediaType, this.context.options.parameterParsers);
    }

}