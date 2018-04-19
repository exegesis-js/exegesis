import querystring from 'querystring';
import * as oas3 from 'openapi3-ts';
import {MimeTypeRegistry} from '../utils/mime';
import {contentToMediaTypeRegistry} from './oasUtils';
import MediaType from './MediaType';
import Oas3Context from './Oas3Context';
import Parameter from './Parameter';
import { ParserContext } from './parameterParsers/ParserContext';
import { ParametersMap, ParameterBag } from '../types/ApiInterface';
import { ValuesBag } from './parameterParsers';
import { BodyParser } from '../bodyParsers/BodyParser';
import { IValidationError } from '../types/validation';

export default class Operation {
    readonly context: Oas3Context;
    readonly oaOperation: oas3.OperationObject;
    readonly oaPath: oas3.PathItemObject;

    private readonly _requestBodyContentTypes: MimeTypeRegistry<MediaType<BodyParser>>;
    private readonly _parameters: ParameterBag<Parameter[]>;

    constructor(
        context: Oas3Context,
        oaOperation: oas3.OperationObject,
        oaPath: oas3.PathItemObject,
        parentParameters: Parameter[]
    ) {
        this.context = context;
        this.oaOperation = oaOperation;
        this.oaPath = oaPath;

        const requestBody = oaOperation.requestBody &&
            (context.resolveRef(oaOperation.requestBody) as oas3.RequestBodyObject);

        if(requestBody && requestBody.content) {
            // FIX: This should not be a map of MediaTypes, but a map of request bodies.
            // Request body has a "required" flag, which we are currently ignoring.
            this._requestBodyContentTypes = contentToMediaTypeRegistry<BodyParser>(
                context.childContext(['requestBody', 'content']),
                context.options.bodyParsers,
                'body',
                requestBody.required || false,
                requestBody.content
            );
        } else {
            this._requestBodyContentTypes = new MimeTypeRegistry<MediaType<BodyParser>>();
        }

        const localParameters = (this.oaOperation.parameters || [])
            .map((parameter, index) => new Parameter(context.childContext(['parameters', '' + index]), parameter));
        const allParameters =  parentParameters.concat(localParameters);

        this._parameters = allParameters.reduce(
            (result: ParameterBag<Parameter[]>, parameter: Parameter) => {
                (result as any)[parameter.oaParameter.in].push(parameter);
                return result;
            },
            {query: [], header: [], path: [], server: [], cookie: []}
        );
    }

    /**
     * Given a 'content-type' from a request, return a `MediaType` object that
     * matches, or `undefined` if no objects match.
     *
     * @param contentType - The content type from the 'content-type' header on
     *   a request.
     * @returns - The MediaType object to handle this request, or undefined if
     *   no MediaType is set for the given contentType.
     */
    getRequestMediaType(contentType: string) : MediaType<BodyParser> | undefined {
        return this._requestBodyContentTypes.get(contentType);
    }

    private _parseParameterGroup(
        params: Parameter[],
        values: ValuesBag,
        parserContext: ParserContext
    ) : ParametersMap<any> {
        return params.reduce(
            (result: any, parameter: Parameter) => {
                result[parameter.oaParameter.name] = parameter.parser(values, parserContext);
                return result;
            },
            {}
        );
    }

    parseParameters(params : {
        headers : ValuesBag | undefined,
        rawPathParams: ValuesBag | undefined,
        serverParams: ValuesBag | undefined,
        queryString: string | undefined
    }) : ParameterBag<ParametersMap<any>> {
        const {headers, rawPathParams, queryString} = params;
        const ctx = new ParserContext(queryString);

        const parsedQuery = queryString
            ? querystring.parse(queryString, '&', '=', {decodeURIComponent: (val: string) => val})
            : undefined;

        // TODO: Can eek out a little more performance here by precomputing the parsers for each parameter group,
        // since if there are no parameters in a group, we can just do nothing.
        return {
            query: parsedQuery ? this._parseParameterGroup(this._parameters.query, parsedQuery, ctx) : {},
            header: headers ? this._parseParameterGroup(this._parameters.header, headers, ctx) : {},
            server: params.serverParams || {},
            path: rawPathParams ? this._parseParameterGroup(this._parameters.path, rawPathParams, ctx) : {},
            cookie: {}
        };
    }

    validateParameters(parameterValues: ParameterBag<ParametersMap<any>>) : IValidationError[] | null {
        const result: IValidationError[] | null = null;
        for(const parameterLocation of Object.keys(parameterValues)) {
            const parameters: Parameter[] = (this._parameters as any)[parameterLocation] as Parameter[];
            const values = (parameterValues as any)[parameterLocation] as ParametersMap<any>;

            for(const parameter of parameters) {
                parameter.validate(values[parameter.oaParameter.name]);
            }
        }

        return result;
    }
}