import { MimeTypeRegistry } from '../../utils/mime';
import RequestMediaType from '../RequestMediaType';

import * as oas3 from 'openapi3-ts';
import Oas3CompileContext from '../Oas3CompileContext';
import { ParameterLocation } from '../..';

export function isSpecificationExtension(key: string) {
    return key.startsWith('x-');
}

export function isReferenceObject(obj: any): obj is oas3.ReferenceObject {
    return !!obj.$ref;
}

/**
 *
 * @param openApiDoc - The openApiDocument this `content` object is from.
 * @param path - The path to the `content` object.
 * @param content - The `content` object.
 */
export function contentToRequestMediaTypeRegistry(
    context: Oas3CompileContext,
    parameterLocation: ParameterLocation,
    parameterRequired: boolean,
    content?: oas3.ContentObject
) {
    const answer = new MimeTypeRegistry<RequestMediaType>();

    if (content) {
        for (const mediaType of Object.keys(content)) {
            const oaMediaType = content[mediaType];
            answer.set(
                mediaType,
                new RequestMediaType(
                    context.childContext(mediaType),
                    oaMediaType,
                    mediaType,
                    parameterLocation,
                    parameterRequired
                )
            );
        }
    }

    return answer;
}
