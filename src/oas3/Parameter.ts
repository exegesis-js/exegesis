import { JSONSchema4, JSONSchema6 } from 'json-schema';
import { ParameterLocation, ValidatorFunction, oas3 } from '../types';
import { extractSchema } from '../utils/jsonSchema';
import Oas3CompileContext from './Oas3CompileContext';
import { generateRequestValidator } from './Schema/validators';
import { isReferenceObject } from './oasUtils';
import { ParameterParser, generateParser } from './parameterParsers';
import * as urlEncodedBodyParser from './urlEncodedBodyParser';

const DEFAULT_STYLE : {[style: string]: string} = {
    path: 'simple',
    query: 'form',
    cookie: 'form',
    header: 'simple'
};

function getDefaultExplode(style: string) : boolean {
    return style === 'form';
}

function generateSchemaParser(self: Parameter, schema: JSONSchema4 | JSONSchema6) {
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
    readonly context: Oas3CompileContext;
    readonly oaParameter: oas3.ParameterObject;

    readonly location: ParameterLocation;
    readonly validate: ValidatorFunction;

    /**
     * Parameter parser used to parse this parameter.
     */
    readonly name: string;
    readonly parser: ParameterParser;

    constructor(context: Oas3CompileContext, oaParameter: oas3.ParameterObject | oas3.ReferenceObject) {
        const resOaParameter = isReferenceObject(oaParameter)
            ? context.resolveRef(oaParameter.$ref) as oas3.ParameterObject
            : oaParameter;

        this.location = {
            in: resOaParameter.in,
            name: resOaParameter.name,
            docPath: context.jsonPointer,
            path: ''
        };
        this.name = resOaParameter.name;

        this.context = context;
        this.oaParameter = resOaParameter;
        this.validate = (value) => ({errors: null, value});

        // Find the schema for this parameter.
        if(resOaParameter.schema) {
            const schemaContext = context.childContext('schema');
            const schema = extractSchema(
                context.openApiDoc,
                schemaContext.jsonPointer,
                {resolveRef: context.resolveRef.bind(context)}
            );
            this.parser = generateSchemaParser(this, schema);
            this.validate = generateRequestValidator(
                schemaContext,
                this.location,
                resOaParameter.required || false,
                'application/x-www-form-urlencoded'
            );

        } else if(resOaParameter.content) {
            // `parameter.content` must have exactly one key
            const mediaTypeString = Object.keys(resOaParameter.content)[0];
            const oaMediaType = resOaParameter.content[mediaTypeString];
            const mediaTypeContext = context.childContext(['content', mediaTypeString]);

            let parser = context.options.parameterParsers.get(mediaTypeString);

            // OAS3 has special handling for 'application/x-www-form-urlencoded'.
            if(!parser && mediaTypeString === 'application/x-www-form-urlencoded') {
                parser = urlEncodedBodyParser.generateStringParser(mediaTypeContext, oaMediaType, this.location);
            }

            if(!parser) {
                throw new Error('Unable to find suitable mime type parser for ' +
                    `type ${mediaTypeString} in ${context.jsonPointer}/content`);
            }

            // FIXME: We don't handle 'application/x-www-form-urlencoded' here
            // correctly.
            this.parser = generateParser({
                required: resOaParameter.required || false,
                schema: oaMediaType.schema,
                contentType: mediaTypeString,
                parser,
                uriEncoded: ['query', 'path'].includes(resOaParameter.in)
            });

            if(oaMediaType.schema) {
                this.validate = generateRequestValidator(
                    mediaTypeContext.childContext('schema'),
                    this.location,
                    resOaParameter.required || false,
                    mediaTypeString
                );
            }
        } else {
            throw new Error(`Parameter ${resOaParameter.name} should have a 'schema' or a 'content'`);
        }

    }
}