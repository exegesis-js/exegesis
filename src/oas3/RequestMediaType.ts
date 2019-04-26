import ld from 'lodash';
import * as oas3 from 'openapi3-ts';

import { ValidatorFunction, ParameterLocation, BodyParser } from '../types';
import { generateRequestValidator } from './Schema/validators';
import Oas3CompileContext from './Oas3CompileContext';
import * as urlEncodedBodyParser from './urlEncodedBodyParser';

function generateAddDefaultParser(parser: BodyParser, def: any) : BodyParser {
    return {
        parseReq(req, res, next) {
            parser.parseReq(req, res, (err, result) => {
                if(err) {
                    return next(err);
                }
                // TODO: How to test this?  How do you even get here?  If there's
                // no 'content-type' you'll never get to a RequestMediaType in
                // the first place.  If the type is `application/json`, a 0-length
                // body will be invalid.  If the type is `text/plain`, a 0-length
                // body is the empty string, which is not undefined.  I don't
                // think this is ever going to be called.
                if(result === undefined && req.body === undefined) {
                    req.body = ld.cloneDeep(def);
                    next(null, req.body);
                } else {
                    next(err, result);
                }
            });
        }
    };
}

export default class RequestMediaType {
    readonly context: Oas3CompileContext;
    readonly oaMediaType: oas3.MediaTypeObject;
    readonly parser: BodyParser;
    readonly validator: ValidatorFunction;

    constructor(
        context : Oas3CompileContext,
        oaMediaType: oas3.MediaTypeObject,
        mediaType: string,
        parameterLocation: ParameterLocation,
        parameterRequired: boolean
    ) {
        this.context = context;
        this.oaMediaType = oaMediaType;

        let parser = this.context.options.bodyParsers.get(mediaType);

        // OAS3 has special handling for 'application/x-www-form-urlencoded'.
        if(!parser && mediaType === 'application/x-www-form-urlencoded') {
            parser = urlEncodedBodyParser.generateBodyParser(context, oaMediaType, parameterLocation);
        }

        if(!parser) {
            throw new Error('Unable to find suitable mime type parser for ' +
                `type ${mediaType} in ${context.jsonPointer}`);
        }

        const schema = oaMediaType.schema && context.resolveRef(oaMediaType.schema);

        if(schema && ('default' in schema)) {
            this.parser = generateAddDefaultParser(parser, schema.default);
        } else {
            this.parser = parser;
        }

        if(schema) {
            const schemaContext = context.childContext('schema');
            this.validator = generateRequestValidator(schemaContext, parameterLocation, parameterRequired, mediaType);
        } else {
            this.validator = value => ({errors: null, value});
        }
    }
}