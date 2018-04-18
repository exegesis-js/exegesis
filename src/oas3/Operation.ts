import querystring from 'querystring';
import * as oas3 from 'openapi3-ts';
import { ValidatorFunction } from '../types/common';
import {MimeTypeRegistry} from '../utils/mime';
import {contentToMediaTypeRegistry} from './oasUtils';
import MediaType from './MediaType';
import Oas3Context from './Oas3Context';
import Parameter from './Parameter';
import { ParameterBag } from './types';
import { ParserContext } from './parameterParsers/ParserContext';
import { ValuesBag } from './parameterParsers';

export default class Operation {
    readonly context: Oas3Context;
    readonly oaOperation: oas3.OperationObject;
    readonly oaPath: oas3.PathItemObject;
    readonly validator?: ValidatorFunction;

    private readonly _requestBodies: MimeTypeRegistry<MediaType>;
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
            this._requestBodies = contentToMediaTypeRegistry(
                context.childContext(['requestBody', 'content']),
                requestBody.content
            );
        } else {
            this._requestBodies = new MimeTypeRegistry<MediaType>();
        }

        const localParameters = (this.oaOperation.parameters || [])
            .map((parameter, index) => new Parameter(context.childContext(['parameters', '' + index]), parameter));
        const allParameters =  parentParameters.concat(localParameters);

        this._parameters = allParameters.reduce(
            (result: ParameterBag<Parameter[]>, parameter: Parameter) => {
                (result as any)[parameter.oaParameter.in].push(parameter);
                return result;
            },
            {query: [], header: [], path: [], cookie: []}
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
    getRequestMediaType(contentType: string) : MediaType | undefined {
        return this._requestBodies.get(contentType);
    }

    private _parseParameterGroup(
        params: Parameter[],
        values: ValuesBag,
        parserContext: ParserContext
    ) {
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
        pathParams: ValuesBag | undefined,
        serverParams: ValuesBag | undefined,
        queryString: string | undefined
    }) : ParameterBag<any> {
        const {headers, pathParams, queryString} = params;
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
            path: pathParams ? this._parseParameterGroup(this._parameters.path, pathParams, ctx) : {},
            cookie: {}
        };
    }

    // validateParameters(parameterValues: ParameterBag<any>) : IValidationError[] | null {
    //     const result: IValidationError[] | null = null;
    //     for(const key of Object.keys(parameterValues)) {
    //         const parameters = this._parameters[key] as Parameter[];
    //         const values = parameterValues[key];

    //         for(const parameter of parameters) {
    //             parameter.validate(parameters[parameter.oaParameter.name]);
    //         }
    //     }
    // }
}