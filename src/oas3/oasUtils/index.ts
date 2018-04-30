import {MimeTypeRegistry} from '../../utils/mime';
import MediaType from '../MediaType';

import * as oas3 from 'openapi3-ts';
import Oas3CompileContext from '../Oas3CompileContext';
import { ParameterLocation } from '../..';

export function isSpecificationExtension(key: string) {
    return key.startsWith('x-');
}

export function isReferenceObject(obj: any) : obj is oas3.ReferenceObject {
    return !!obj.$ref;
}

/**
 *
 * @param openApiDoc - The openApiDocument this `content` object is from.
 * @param path - The path to the `content` object.
 * @param content - The `content` object.
 */
export function contentToMediaTypeRegistry<T>(
    context: Oas3CompileContext,
    parserRegistry: MimeTypeRegistry<T>,
    parameterLocation: ParameterLocation,
    parameterRequired: boolean,
    content?: oas3.ContentObject
) {
    const answer = new MimeTypeRegistry<MediaType<T>>();

    if(content) {
        for(const mediaType of Object.keys(content)) {
            const oaMediaType = content[mediaType];
            const mediaContext = context.childContext(mediaType);
            const parser = parserRegistry.get(mediaType);

            if(!parser) {
                throw new Error('Unable to find suitable mime type parser for ' +
                    `type ${mediaType} in ${context.jsonPointer}`);
            }

            answer.set(mediaType, new MediaType<T>(
                mediaContext,
                oaMediaType,
                parameterLocation,
                parameterRequired,
                parser
            ));
        }
    }

    return answer;
}