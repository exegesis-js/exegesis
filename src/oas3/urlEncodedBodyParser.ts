import * as oas3 from 'openapi3-ts';
import * as jsonPtr from 'json-ptr';
import querystring from 'querystring';
import BodyParserWrapper from '../bodyParsers/BodyParserWrapper';
import { MimeTypeParser, ParameterLocation, StringParser } from '../types';
import { resolveRef } from '../utils/json-schema-resolve-ref';
import { extractSchema } from '../utils/jsonSchema';
import Oas3CompileContext from './Oas3CompileContext';
import {
    ParameterDescriptor,
    ParameterParser,
    generateParser,
    parseQueryParameters,
} from './parameterParsers';

// OAS3 has special handling for 'application/x-www-form-urlencoded'.  Parameters
// and bodies of this type are allowed to define an `encoding` section with
// special treatment for specific properties.  This handles generating a parser
// for this content-type.

// Find a property in a JSON Schema.
function findProperty(
    path: string[],
    schema: oas3.SchemaObject,
    propertyName: string
): string[] | undefined {
    if (schema.properties && schema.properties[propertyName]) {
        return path;
    }

    const allOf = schema.allOf || [];
    for (let index = 0; index < allOf.length; index++) {
        const childSchema = resolveRef(schema, allOf[index]);
        const answer = findProperty(path.concat(['allOf', `${index}`]), childSchema, propertyName);
        if (answer) {
            return answer;
        }
    }

    return undefined;
}

export function generateStringParser(
    context: Oas3CompileContext,
    mediaType: oas3.MediaTypeObject,
    parameterLocation: ParameterLocation
): StringParser {
    const parameterParsers: {
        location: ParameterLocation;
        parser: ParameterParser;
    }[] = [];

    if (mediaType.encoding) {
        if (!mediaType.schema) {
            throw new Error(
                `Media Type Object ${context.jsonPointer} with 'content' must have a 'schema'`
            );
        }

        // Find the schema object for the mediaType.
        const schema = resolveRef(context.openApiDoc, `${context.jsonPointer}/schema`);

        // The encoding object describes how parameters should be parsed from the document.
        for (const parameterName of Object.keys(mediaType.encoding)) {
            const encoding: oas3.EncodingPropertyObject = mediaType.encoding[parameterName];

            const parameterSchemaPath = findProperty([], schema, parameterName);
            if (!parameterSchemaPath) {
                throw new Error(
                    `Cannot find parameter ${parameterName} in schema for ${context.jsonPointer}`
                );
            }

            const parameterSchema = extractSchema(
                context.openApiDoc,
                jsonPtr.encodePointer(parameterSchemaPath)
            );

            let parameterDescriptor: ParameterDescriptor;
            if (encoding.contentType) {
                const parser = context.options.parameterParsers.get(encoding.contentType);
                if (!parser) {
                    throw new Error(
                        `No string parser found for ${encoding.contentType} in ${context.jsonPointer}`
                    );
                }
                parameterDescriptor = {
                    contentType: encoding.contentType,
                    parser,
                    uriEncoded: true,
                    schema: parameterSchema,
                };
            } else {
                parameterDescriptor = {
                    style: encoding.style || 'form',
                    explode: encoding.explode || false,
                    allowReserved: encoding.allowReserved || false,
                    schema: parameterSchema,
                };
            }

            parameterParsers.push({
                location: {
                    in: parameterLocation.in,
                    name: parameterName,
                    docPath: context.childContext(['encoding', parameterName]).jsonPointer,
                },
                parser: generateParser(parameterDescriptor),
            });
        }
    }

    return {
        parseString(encoded: string): any {
            const rawResult = querystring.parse(encoded);
            const parsedResult = parseQueryParameters(parameterParsers, encoded);
            return Object.assign(rawResult, parsedResult);
        },
    };
}

export function generateBodyParser(
    context: Oas3CompileContext,
    mediaType: oas3.MediaTypeObject,
    parameterLocation: ParameterLocation
): MimeTypeParser {
    const stringParser = generateStringParser(context, mediaType, parameterLocation);
    return new BodyParserWrapper(stringParser, context.options.defaultMaxBodySize);
}
