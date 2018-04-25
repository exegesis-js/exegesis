import $RefParser from 'json-schema-ref-parser';
import oas3 from 'openapi3-ts';

import OpenApi from './OpenApi';
import { ExgesisCompiledOptions } from '../options';

/**
 * Reads an OpenAPI document from a YAML or JSON file.
 *
 * @param openApiDocFile - The file containing the OpenAPI document.
 * @returns - Returns the parsed OpenAPI document.
 */
export function compile(
    openApiDocFile: string | oas3.OpenAPIObject,
    options: ExgesisCompiledOptions
): Promise<OpenApi> {
    const refParser = new $RefParser();

    return refParser.bundle(
        openApiDocFile as any,
        {dereference: {circular: false}}
    )
    .then((openApiDoc: any) => {
        return new OpenApi(openApiDoc as oas3.OpenAPIObject, options);
    });
}
