import {MimeTypeRegistry} from '../../utils/mime';
import MediaType from '../MediaType';

import * as oas3 from 'openapi3-ts';
import Oas3Context from '../Oas3Context';

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
export function contentToMediaTypeRegistry(
    context: Oas3Context,
    content?: oas3.ContentObject
) {
    const answer = new MimeTypeRegistry<MediaType>();

    if(content) {
        for(const mediaType of Object.keys(content)) {
            const oaMediaType = content[mediaType];
            const mediaContext = context.childContext(mediaType);

            answer.set(mediaType, new MediaType(
                mediaContext,
                oaMediaType,
                'body',
                'body'
            ));
        }
    }

    return answer;
}