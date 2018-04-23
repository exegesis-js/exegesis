import pb from 'promise-breaker';
import querystring from 'querystring';
import * as oas3 from 'openapi3-ts';

import {MimeTypeRegistry} from '../utils/mime';
import {contentToMediaTypeRegistry} from './oasUtils';
import MediaType from './MediaType';
import Oas3Context from './Oas3Context';
import Parameter from './Parameter';
import { ParserContext } from './parameterParsers/ParserContext';
import { ValuesBag, parseParameters } from './parameterParsers';
import {
    ParametersMap,
    ParametersByLocation,
    BodyParser,
    IValidationError,
    ExegesisContext,
    ExegesisNamedSecurityScheme,
    ExegesisSecurityScheme
} from '../types';
import { EXEGESIS_CONTROLLER, EXEGESIS_OPERATION_ID } from './extensions';
import { HttpError } from '../errors';

function getSecurityRequirements(
    context: Oas3Context, // Operation context.
    oaOperation: oas3.OperationObject
) {
    const securityRequirements = oaOperation.security || context.openApiDoc.security || {};
    const securityRequirementsLength = Object.keys(securityRequirements).length;
    let requiredRoles = oaOperation['x-exegesis-roles'] || context.openApiDoc['x-exegesis-roles'] || [];

    if(requiredRoles && requiredRoles.length > 0 && (securityRequirementsLength === 0)) {
        if(oaOperation.security && !oaOperation['x-exegesis-roles']) {
            // Operation explicitly sets security to `{}`, but doesn't set
            // `x-exegesis-roles`.  This is OK - we'll ingore roles for this
            // case.
            requiredRoles = [];
        } else {
            throw new Error(`Operation ${context.jsonPointer} requires ` +
                `roles ${requiredRoles.join(',')} but has no security requirements.`);
        }
    }

    return {securityRequirements, requiredRoles};
}

export default class Operation {
    readonly context: Oas3Context;
    readonly oaOperation: oas3.OperationObject;
    readonly oaPath: oas3.PathItemObject;
    readonly exegesisController: string;
    readonly operationId: string;
    readonly securitySchemeNames: string[];
    readonly securityRequirements: oas3.SecurityRequirementObject;
    readonly requiredRoles: string[];

    private readonly _requestBodyContentTypes: MimeTypeRegistry<MediaType<BodyParser>>;
    private readonly _parameters: ParametersByLocation<Parameter[]>;

    constructor(
        context: Oas3Context,
        oaOperation: oas3.OperationObject,
        oaPath: oas3.PathItemObject,
        exegesisController: string | undefined,
        parentParameters: Parameter[]
    ) {
        this.context = context;
        this.oaOperation = oaOperation;
        this.oaPath = oaPath;
        this.exegesisController = oaOperation[EXEGESIS_CONTROLLER] || exegesisController;
        this.operationId = oaOperation[EXEGESIS_OPERATION_ID] || oaOperation.operationId;

        const security = getSecurityRequirements(context, oaOperation);
        this.securitySchemeNames = Object.keys(security.securityRequirements);
        this.securityRequirements = security.securityRequirements;
        this.requiredRoles = security.requiredRoles;

        for(const schemeName of this.securitySchemeNames) {
            if(!context.options.securityPlugins.find(p => p.scheme === schemeName)) {
                throw new Error(`Operation ${context.jsonPointer} references security scheme ${schemeName} ` +
                    `but no security plugin was provided.`);
            }
        }

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
            (result: ParametersByLocation<Parameter[]>, parameter: Parameter) => {
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

    parseParameters(params : {
        headers : ValuesBag | undefined,
        rawPathParams: ValuesBag | undefined,
        serverParams: ValuesBag | undefined,
        queryString: string | undefined
    }) : ParametersByLocation<ParametersMap<any>> {
        const {headers, rawPathParams, queryString} = params;
        const ctx = new ParserContext(queryString);

        const parsedQuery = queryString
            ? querystring.parse(queryString, '&', '=', {decodeURIComponent: (val: string) => val})
            : undefined;

        // TODO: Can eek out a little more performance here by precomputing the parsers for each parameter group,
        // since if there are no parameters in a group, we can just do nothing.
        return {
            query: parsedQuery ? parseParameters(this._parameters.query, ctx, parsedQuery) : {},
            header: headers ? parseParameters(this._parameters.header, ctx, headers) : {},
            server: params.serverParams || {},
            path: rawPathParams ? parseParameters(this._parameters.path, ctx, rawPathParams) : {},
            cookie: {}
        };
    }

    validateParameters(parameterValues: ParametersByLocation<ParametersMap<any>>) : IValidationError[] | null {
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

    async authenticate(context: ExegesisContext) : Promise<ExegesisNamedSecurityScheme | undefined> {
        if(this.securitySchemeNames.length === 0) {
            // No auth required
            return undefined;
        }

        let errors: string[] | undefined;
        let authenticated : ExegesisSecurityScheme | undefined;
        let result : ExegesisNamedSecurityScheme | undefined;

        for(const {scheme, plugin} of this.context.options.securityPlugins) {
            if(!this.securityRequirements[scheme]) {
                // This operation doesn't want the scheme - don't bother calling it.
                continue;
            }

            authenticated = await pb.call(plugin, null, context);
            if(!authenticated) {
                // Couldn't authenticate.  Try the next one.
                continue;
            }

            const missingRoles = this.requiredRoles.filter(role =>
                authenticated && (!authenticated.roles || authenticated.roles.indexOf(role) === -1));

            if(missingRoles.length > 0) {
                errors = errors || [];
                errors.push(`Authenticated using ${scheme} but missing required roles ${missingRoles.join(', ')}.`);
                continue; // Try another authentication scheme.
            }

            result = Object.assign({name: scheme}, authenticated);

            break;
        }

        if(result) {
            return result;
        } else if(errors) {
            throw new HttpError(403, errors.join('\n'));
        } else {
            throw new HttpError(401, `Must authorize using one of the following ` +
                `schemes ${this.securitySchemeNames.join(', ')}`);
        }
    }
}