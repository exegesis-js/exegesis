import { generateRequestValidator } from './Schema/validators';
import { generateParser, ParameterParser } from './parameterParsers';
import Oas3Context from './Oas3Context';

import { isReferenceObject } from './oasUtils';
import MediaType from './MediaType';

import { ValidatorFunction, ParameterLocation, StringParser, oas3 } from '../types';

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

    return generateParser({
        required: self.oaParameter.required,
        style,
        explode,
        allowReserved,
        schema
    });
}

export default class Parameter {
    readonly context: Oas3Context;
    readonly oaParameter: oas3.ParameterObject;

    readonly location: ParameterLocation;
    readonly validate: ValidatorFunction;

    /**
     * Parameter parser used to parse this parameter.
     */
    readonly name: string;
    readonly parser: ParameterParser;

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

            this.parser = generateParser({
                required: resOaParameter.required || false,
                contentType: mediaTypeString,
                parser,
                uriEncoded: ['query', 'path'].indexOf(resOaParameter.in) > -1
            });

            const mediaType = new MediaType<StringParser>(
                context.childContext(['content', mediaTypeString]),
                oaMediaType,
                resOaParameter.in,
                resOaParameter.name,
                resOaParameter.required || false,
                parser
            );
            this.validate = mediaType.validator.bind(mediaType);
        } else {
            throw new Error(`Parameter ${resOaParameter.name} should have a 'schema' or a 'content'`);
        }

    }
}