import $RefParser from 'json-schema-ref-parser';
import OpenApi from './oas3';
import {ExegesisOptions, compileOptions} from './options';
import * as oas3 from 'openapi3-ts';

/**
 * Reads an OpenAPI document from a YAML or JSON file.
 *
 * @param openApiDocFile - The file containing the OpenAPI document.
 * @returns {Promise<OpenApi>} - Returns the parsed OpenAPI document.
 */
export function compile(openApiDocFile: string, options?: ExegesisOptions): Promise<OpenApi> {
    const refParser = new $RefParser();

    return refParser.dereference(openApiDocFile, {dereference: {circular: false}})
    .then((openApiDoc: any) => {
        return new OpenApi(openApiDoc as oas3.OpenAPIObject, compileOptions(options));
    });
}
