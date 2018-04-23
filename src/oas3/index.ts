import $RefParser from 'json-schema-ref-parser';
import oas3 from 'openapi3-ts';

import OpenApi from './OpenApi';
import { ExgesisCompiledOptions } from '../types/internal';

/**
 * Reads an OpenAPI document from a YAML or JSON file.
 *
 * @param openApiDocFile - The file containing the OpenAPI document.
 * @returns - Returns the parsed OpenAPI document.
 */
// TODO: Support promise or callback.
export function compile(openApiDocFile: string, options: ExgesisCompiledOptions): Promise<OpenApi> {
    const refParser = new $RefParser();

    return refParser.dereference(openApiDocFile, {dereference: {circular: false}})
    .then((openApiDoc: any) => {
        return new OpenApi(openApiDoc as oas3.OpenAPIObject, options);
    });
}
