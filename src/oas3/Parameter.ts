import inferTypes from './../utils/json-schema-infer-types';
import {generateRequestValidator} from './Schema/validators';
import { RawParameterParser, getParser, ValuesBag } from './parameterParsers';
import Oas3Context from './Oas3Context';

import * as oas3 from 'openapi3-ts';
import { ValidatorFunction, ParameterLocation, ErrorType } from '../types/validation';
import { isReferenceObject } from './oasUtils';
import MediaType from './MediaType';
import { StringParser } from '../bodyParsers/BodyParser';
import { ValidationError } from '../errors';

const DEFAULT_STYLE : {[style: string]: string} = {
    path: 'simple',
    query: 'form',
    cookie: 'form',
    header: 'simple'
};

function getDefaultExplode(style: string) : boolean {
    return style === 'form';
}

function generateSchemaParser(self: Parameter, schema: oas3.SchemaObject) {
    const style = self.oaParameter.style || DEFAULT_STYLE[self.oaParameter.in];
    const explode = (self.oaParameter.explode === null || self.oaParameter.explode === undefined)
        ? getDefaultExplode(style)
        : self.oaParameter.explode;
    const allowReserved = self.oaParameter.allowReserved || false;
    const allowedTypes = inferTypes(schema);
    return getParser(self.location, style, allowedTypes, {explode, allowReserved});
}

function generateMediaTypeParser(
    self: Parameter,
    mediaTypeString: string,
    mediaType: MediaType<StringParser>
) {
    const uriEncoded = self.oaParameter.in === 'query' || self.oaParameter.in === 'path';

    return (values: ValuesBag) : any => {
        try {
            let value = values[self.oaParameter.name];
            if(!value) {return value;}
            if(uriEncoded) {
                if(Array.isArray(value)) {
                    value = value.map(decodeURIComponent);
                } else {
                    value = decodeURIComponent(value);
                }
            }
            if(Array.isArray(value)) {
                return value.map(mediaType.parser.parseString);
            } else {
                return mediaType.parser.parseString(value);
            }
        } catch (err) {
            throw new ValidationError({
                type: ErrorType.Error,
                message: `Error parsing parameter ${self.oaParameter.name} of type ${mediaTypeString}: ` +
                    err.message,
                location: self.location
            });
        }
    };}

export default class Parameter {
    readonly context: Oas3Context;
    readonly oaParameter: oas3.ParameterObject;

    readonly location: ParameterLocation;
    readonly validate: ValidatorFunction;

    /**
     * Parameter parser used to parse this parameter.
     */
    readonly name: string;
    readonly parser: RawParameterParser;

    constructor(context: Oas3Context, oaParameter: oas3.ParameterObject | oas3.ReferenceObject) {
        const resOaParameter = isReferenceObject(oaParameter)
            ? context.resolveRef(oaParameter.$ref) as oas3.ParameterObject
            : oaParameter;

        this.location = {
            in: resOaParameter.in,
            name: resOaParameter.name,
            docPath: context.path
        };
        this.name = resOaParameter.name;

        this.context = context;
        this.oaParameter = resOaParameter;
        this.validate = () => null;

        // Find the schema for this parameter.
        if(resOaParameter.schema) {
            // FIXME: Extract schema?
            const schema = context.resolveRef(resOaParameter.schema) as oas3.SchemaObject;
            this.parser = generateSchemaParser(this, schema);
            this.validate = generateRequestValidator(
                context.childContext('schema'),
                resOaParameter.in,
                resOaParameter.name,
                resOaParameter.required || false
            );

        } else if(resOaParameter.content) {
            // `parameter.content` must have exactly one key
            // FIXME: Extract schema?
            const mediaTypeString = Object.keys(resOaParameter.content)[0];
            const oaMediaType = resOaParameter.content[mediaTypeString];
            const parser = context.options.parameterParsers.get(mediaTypeString);

            if(!parser) {
                throw new Error('Unable to find suitable mime type parser for ' +
                    `type ${mediaTypeString} in ${context.jsonPointer}/content`);
            }

            const mediaType = new MediaType<StringParser>(
                context.childContext(['content', mediaTypeString]),
                oaMediaType,
                resOaParameter.in,
                resOaParameter.name,
                resOaParameter.required || false,
                parser
            );

            this.parser = generateMediaTypeParser(this, mediaTypeString, mediaType);
            this.validate = mediaType.validator.bind(mediaType);
        } else {
            throw new Error(`Parameter ${resOaParameter.name} should have a 'schema' or a 'content'`);
        }

    }
}