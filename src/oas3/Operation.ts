import pb from 'promise-breaker';
import * as oas3 from 'openapi3-ts';

import {MimeTypeRegistry} from '../utils/mime';
import {contentToMediaTypeRegistry} from './oasUtils';
import MediaType from './MediaType';
import Oas3Context from './Oas3Context';
import Parameter from './Parameter';
import { RawValues, parseParameterGroup, parseQueryParameters } from './parameterParsers';
import {
    ParametersMap,
    ParametersByLocation,
    BodyParser,
    IValidationError,
    ExegesisContext,
    ExegesisNamedSecurityScheme,
    ExegesisSecurityScheme
} from '../types';
import { EXEGESIS_CONTROLLER, EXEGESIS_OPERATION_ID, EXEGESIS_ROLES } from './extensions';
import { HttpError } from '../errors';

// Returns a `{securityRequirements, requiredRoles}` object for the given operation.
function getSecurityRequirements(
    context: Oas3Context, // Operation context.
    oaOperation: oas3.OperationObject
) {
    const securityRequirements = oaOperation.security || context.openApiDoc.security || {};
    const securityRequirementsLength = Object.keys(securityRequirements).length;
    let requiredRoles = oaOperation[EXEGESIS_ROLES] || context.openApiDoc[EXEGESIS_ROLES] || [];

    if(requiredRoles && requiredRoles.length > 0 && (securityRequirementsLength === 0)) {
        if(oaOperation.security && !oaOperation[EXEGESIS_ROLES]) {
            // Operation explicitly sets security to `{}`, but doesn't set
            // `x-exegesis-roles`.  This is OK - we'll ingore roles for this
            // case.
            requiredRoles = [];
        } else {
            throw new Error(`Operation ${context.jsonPointer} has no security requirements, but requires roles: ` +
                requiredRoles.join(','));
        }
    }

    if(typeof requiredRoles === 'string') {
        requiredRoles = [requiredRoles];
    } else if(!Array.isArray(requiredRoles)) {
        const rolesPath = oaOperation[EXEGESIS_ROLES]
            ? context.jsonPointer + `/${EXEGESIS_ROLES}`
            : `/${EXEGESIS_ROLES}`;
        throw new Error(`${rolesPath} must be an array of strings.`);
    }

    return {securityRequirements, requiredRoles};
}

function getMissing(required: string[], have: string[] | undefined) {
    if((!have || have.length === 0) && required.length > 0) {
        return required;
    }
    return required.filter(r => have && have.indexOf(r) === -1);
}

function validateController(
    context: Oas3Context,
    controller: string | undefined,
    operationId: string | undefined
) {
    if(!controller && !context.options.allowMissingControllers) {
        throw new Error(`Missing ${EXEGESIS_CONTROLLER} for ${context.jsonPointer}`);
    }
    if(!operationId && !context.options.allowMissingControllers) {
        throw new Error(`Missing operationId or ${EXEGESIS_OPERATION_ID} for ${context.jsonPointer}`);
    }
    if(controller && operationId) {
        if(!context.options.controllers[controller]) {
            throw new Error(`Could not find controller ${controller} defined in ${context.jsonPointer}`);
        } else if(!context.options.controllers[controller][operationId]) {
            throw new Error(`Could not find operation ${controller}#${operationId} defined in ${context.jsonPointer}`);
        }
    }
}

/*
 * Validate that all operations/request bodies have a controller and
 * operationId defined.
 */
function validateControllers(
    context: Oas3Context,
    requestBody: oas3.RequestBodyObject | undefined,
    opController: string | undefined,
    operationId: string | undefined
) {
    if(requestBody) {
        for(const mediaType of Object.keys(requestBody.content)) {
            const mediaContext = context.childContext(['requestBody', 'content', mediaType]);
            const mediaTypeObject = requestBody.content[mediaType];
            const mediaController = mediaTypeObject[EXEGESIS_CONTROLLER] || opController;
            const mediaOperationId = mediaTypeObject[EXEGESIS_OPERATION_ID] || operationId;
            validateController(mediaContext, mediaController, mediaOperationId);
        }
    } else {
        validateController(context, opController, operationId);
    }
}

export default class Operation {
    readonly context: Oas3Context;
    readonly oaOperation: oas3.OperationObject;
    readonly oaPath: oas3.PathItemObject;
    readonly exegesisController: string | undefined;
    readonly operationId: string | undefined;
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
                throw new Error(`Operation ${context.jsonPointer} references security scheme "${schemeName}" ` +
                    `but no security plugin was provided.`);
            }
        }

        const requestBody = oaOperation.requestBody &&
            (context.resolveRef(oaOperation.requestBody) as oas3.RequestBodyObject);

        validateControllers(
            context,
            requestBody,
            this.exegesisController,
            this.operationId
        );

        if(requestBody && requestBody.content) {
            const contentContext = context.childContext(['requestBody', 'content']);
            // FIX: This should not be a map of MediaTypes, but a map of request bodies.
            // Request body has a "required" flag, which we are currently ignoring.
            this._requestBodyContentTypes = contentToMediaTypeRegistry<BodyParser>(
                contentContext,
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
        headers : RawValues | undefined,
        rawPathParams: RawValues | undefined,
        serverParams: RawValues | undefined,
        queryString: string | undefined
    }) : ParametersByLocation<ParametersMap<any>> {
        const {headers, rawPathParams, queryString} = params;

        return {
            query: queryString ? parseQueryParameters(this._parameters.query, queryString) : {},
            header: headers ? parseParameterGroup(this._parameters.header, headers) : {},
            server: params.serverParams || {},
            path: rawPathParams ? parseParameterGroup(this._parameters.path, rawPathParams) : {},
            cookie: {}
        };
    }

    validateParameters(parameterValues: ParametersByLocation<ParametersMap<any>>) : IValidationError[] | null {
        let result: IValidationError[] | null = null;
        for(const parameterLocation of Object.keys(parameterValues)) {
            const parameters: Parameter[] = (this._parameters as any)[parameterLocation] as Parameter[];
            const values = (parameterValues as any)[parameterLocation] as ParametersMap<any>;

            for(const parameter of parameters) {
                const innerResult = parameter.validate(values[parameter.oaParameter.name]);
                if(innerResult && innerResult.length > 0) {
                    result = result || [];
                    result = result.concat(innerResult);
                }
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
            if(context.isResponseFinished()) {
                // Some plugin has written a response.  We're done.
                break;
            }

            if(!this.securityRequirements[scheme]) {
                // This operation doesn't want the scheme - don't bother calling it.
                continue;
            }

            authenticated = await pb.call(plugin, null, context);
            if(!authenticated) {
                // Couldn't authenticate.  Try the next one.
                continue;
            }

            const missingScopes = getMissing(this.securityRequirements[scheme], authenticated && authenticated.scopes);
            if(missingScopes.length > 0) {
                errors = errors || [];
                errors.push(`Authenticated using '${scheme}' but missing required ` +
                    `scopes: ${missingScopes.join(', ')}.`);
                continue; // Try another authentication scheme.
            }

            const missingRoles = getMissing(this.requiredRoles, authenticated && authenticated.roles);
            if(missingRoles.length > 0) {
                errors = errors || [];
                errors.push(`Authenticated using '${scheme}' but missing required roles: ${missingRoles.join(', ')}.`);
                continue; // Try another authentication scheme.
            }

            // Success!
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