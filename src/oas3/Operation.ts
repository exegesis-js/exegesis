import deepFreeze from 'deep-freeze';
import ld from 'lodash';
import pb from 'promise-breaker';
import * as oas3 from 'openapi3-ts';

import { MimeTypeRegistry } from '../utils/mime';
import { contentToRequestMediaTypeRegistry } from './oasUtils';
import RequestMediaType from './RequestMediaType';
import Oas3CompileContext from './Oas3CompileContext';
import Parameter from './Parameter';
import { RawValues, parseParameterGroup, parseQueryParameters } from './parameterParsers';
import {
    ParametersMap,
    ParametersByLocation,
    IValidationError,
    ExegesisContext,
    AuthenticationSuccess,
    Dictionary,
    AuthenticationFailure,
    AuthenticationResult,
    ExegesisResponse,
    ResponseValidationResult,
    ParameterLocations
} from '../types';
import { EXEGESIS_CONTROLLER, EXEGESIS_OPERATION_ID } from './extensions';
import Responses from './Responses';
import SecuritySchemes from './SecuritySchemes';

const METHODS_WITH_BODY = ['post', 'put', 'patch'];

function isAuthenticationFailure(result : any) : result is AuthenticationFailure {
    return !!(result.type === 'invalid' || result.type === 'missing');
}

function getMissing(required: string[], have: string[] | undefined) {
    if(!have || have.length === 0) {
        return required;
    } else {
        return required.filter(r => !have.includes(r));
    }
}

function validateController(
    context: Oas3CompileContext,
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
    context: Oas3CompileContext,
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
    readonly context: Oas3CompileContext;
    readonly oaOperation: oas3.OperationObject;
    readonly oaPath: oas3.PathItemObject;
    readonly exegesisController: string | undefined;
    readonly operationId: string | undefined;
    readonly securityRequirements: oas3.SecurityRequirementObject[];
    readonly parameterLocations: ParameterLocations;

    /**
     * If this operation has a `requestBody`, this is a list of content-types
     * the operation understands.  If this operation does not expect a request
     * body, then this is undefined.  Note this list may contain wildcards.
     */
    readonly validRequestContentTypes: string[] | undefined;

    private readonly _requestBodyContentTypes: MimeTypeRegistry<RequestMediaType>;
    private readonly _parameters: ParametersByLocation<Parameter[]>;
    private readonly _responses: Responses;
    private readonly _securitySchemes: SecuritySchemes;

    constructor(
        context: Oas3CompileContext,
        oaOperation: oas3.OperationObject,
        oaPath: oas3.PathItemObject,
        method: string,
        exegesisController: string | undefined,
        parentParameters: Parameter[]
    ) {
        this.context = context;
        this.oaOperation = oaOperation;
        this.oaPath = oaPath;
        this.exegesisController = oaOperation[EXEGESIS_CONTROLLER] || exegesisController;
        this.operationId = oaOperation[EXEGESIS_OPERATION_ID] || oaOperation.operationId;

        this.securityRequirements = (oaOperation.security || context.openApiDoc.security || []);

        this._securitySchemes = new SecuritySchemes(context.openApiDoc);

        this._responses = new Responses(
            context.childContext('responses'),
            oaOperation.responses
        );

        for(const securityRequirement of this.securityRequirements) {
            for(const schemeName of Object.keys(securityRequirement)) {
                if(!context.options.authenticators[schemeName]) {
                    throw new Error(`Operation ${context.jsonPointer} references security scheme "${schemeName}" ` +
                        `but no authenticator was provided.`);
                }
            }
        }

        const requestBody = oaOperation.requestBody && METHODS_WITH_BODY.includes(method)
            ? (context.resolveRef(oaOperation.requestBody) as oas3.RequestBodyObject)
            : undefined;

        validateControllers(
            context,
            requestBody,
            this.exegesisController,
            this.operationId
        );

        if(requestBody) {
            this.validRequestContentTypes = Object.keys(requestBody.content);

            const contentContext = context.childContext(['requestBody', 'content']);
            this._requestBodyContentTypes = contentToRequestMediaTypeRegistry(
                contentContext,
                {in: 'request', name: 'body', docPath: contentContext.jsonPointer},
                requestBody.required || false,
                requestBody.content
            );
        } else {
            this._requestBodyContentTypes = new MimeTypeRegistry<RequestMediaType>();
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

        this.parameterLocations = deepFreeze(allParameters.reduce(
            (result: ParameterLocations, parameter: Parameter) => {
                (result as any)[parameter.oaParameter.in] = parameter.location;
                return result;
            },
            {query: {}, header: {}, path: {}, cookie: {}}
        ));
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
    getRequestMediaType(contentType: string) : RequestMediaType | undefined {
        return this._requestBodyContentTypes.get(contentType);
    }

    /**
     * Parse parameters for this operation.
     * @param params - Raw headers, raw path params and server params from
     *   `PathResolver`, and the raw queryString.
     * @returns parsed parameters.
     */
    parseParameters(params : {
        headers : RawValues | undefined,
        rawPathParams: RawValues | undefined,
        serverParams: RawValues | undefined,
        queryString: string | undefined
    }) : ParametersByLocation<ParametersMap<any>> {
        const {headers, rawPathParams, queryString} = params;

        return {
            query: parseQueryParameters(this._parameters.query, queryString),
            header: parseParameterGroup(this._parameters.header, headers || {}),
            server: params.serverParams || {},
            path: rawPathParams ? parseParameterGroup(this._parameters.path, rawPathParams) : {},
            cookie: {}
        };
    }

    validateParameters(parameterValues: ParametersByLocation<ParametersMap<any>>) : IValidationError[] | null {
        // TODO: We could probably make this a lot more efficient by building the schema
        // for the parameter tree.
        let errors: IValidationError[] | null = null;
        for(const parameterLocation of Object.keys(parameterValues)) {
            const parameters: Parameter[] = (this._parameters as any)[parameterLocation] as Parameter[];
            const values = (parameterValues as any)[parameterLocation] as ParametersMap<any>;

            for(const parameter of parameters) {
                const innerResult = parameter.validate(values[parameter.oaParameter.name]);
                if(innerResult && innerResult.errors && innerResult.errors.length > 0) {
                    errors = errors || [];
                    errors = errors.concat(innerResult.errors);
                } else {
                    values[parameter.oaParameter.name] = innerResult.value;
                }
            }
        }

        return errors;
    }

    /**
     * Validate a response.
     *
     * @param response - The response generated by a controller.
     * @param validateDefaultResponses - true to validate all responses, false
     *   to only validate non-default responses.
     */
    validateResponse(
        response: ExegesisResponse,
        validateDefaultResponses: boolean
    ) : ResponseValidationResult {
        return this._responses.validateResponse(
            response.statusCode,
            response.headers,
            response.body,
            validateDefaultResponses
        );
    }

    private async _runAuthenticator(
        schemeName: string,
        triedSchemes : Dictionary<AuthenticationResult>,
        exegesisContext: ExegesisContext,
        requiredScopes: string[]
    ) : Promise<AuthenticationResult> {
        if(!(schemeName in triedSchemes)) {
            const authenticator = this.context.options.authenticators[schemeName];
            const info = this._securitySchemes.getInfo(schemeName);

            const result: AuthenticationResult = (await pb.call(authenticator, null, exegesisContext, info)) ||
                {type: 'missing', status: 401};

            if(result.type !== 'success' && result.type !== 'invalid' && result.type !== 'missing') {
                throw new Error(`Invalid result ${result.type} from authenticator for ${schemeName}`);
            }

            if(isAuthenticationFailure(result)) {
                result.status = result.status || 401;
                if(result.status === 401 && !result.challenge) {
                    result.challenge = this._securitySchemes.getChallenge(schemeName);
                }
            }

            triedSchemes[schemeName] = result;
        }

        let result = triedSchemes[schemeName];

        if(!isAuthenticationFailure(result)) {
            // For OAuth3, need to verify we have the oauth scopes defined in the API doc.
            const missingScopes = getMissing(requiredScopes, result.scopes);
            if(missingScopes.length > 0) {
                result = {
                    type: 'invalid',
                    status: 403,
                    message: `Authenticated using '${schemeName}' but missing ` +
                        `required scopes: ${missingScopes.join(', ')}.`
                };
            }
        }

        return result;
    }

    /**
     * Checks a single security requirement from an OAS3 `security` field.
     *
     * @param triedSchemes - A cache where keys are names of security schemes
     *   we've already tried, and values are the results returned by the
     *   authenticator.
     * @param errors - An array of strings - we can push any errors we encounter
     *   to this list.
     * @param securityRequirement - The security requirement to check.
     * @param exegesisContext - The context for the request to check.
     * @returns - If the security requirement matches, this returns a
     *   `{type: 'authenticated', result}` object, where result is an object
     *   where keys are security schemes and the values are the results from
     *   the authenticator.  If the requirements are not met, returns a
     *   `{type: 'missing', failure}` object or a `{type: 'invalid', failure}`,
     *   object where `failure` is the the failure that caused this security
     *   requirement to not pass.
     */
    private async _checkSecurityRequirement(
        triedSchemes : Dictionary<AuthenticationResult>,
        securityRequirement: oas3.SecurityRequirementObject,
        exegesisContext: ExegesisContext
    ) {
        const requiredSchemes = Object.keys(securityRequirement);

        const result : Dictionary<any> = Object.create(null);
        let failure: AuthenticationFailure | undefined;
        let failedSchemeName: string | undefined;

        for(const scheme of requiredSchemes) {
            if(exegesisContext.isResponseFinished()) {
                // Some authenticator has written a response.  We're done.  :(
                break;
            }

            const requiredScopes = securityRequirement[scheme];
            const authResult = await this._runAuthenticator(scheme, triedSchemes, exegesisContext, requiredScopes);

            if(isAuthenticationFailure(authResult)) {
                // Couldn't authenticate.  Try the next one.
                failure = authResult;
                failedSchemeName = scheme;
                break;
            }

            result[scheme] = authResult;
        }

        if(failure) {
            return {type: failure.type, failure, failedSchemeName};
        } else if(result) {
            return {type: 'authenticated', result};
        } else {
            return undefined;
        }
    }

    async authenticate(
        exegesisContext: ExegesisContext
    ) : Promise<{[scheme: string]: AuthenticationSuccess} | undefined> {
        if(this.securityRequirements.length === 0) {
            // No auth required
            return {};
        }
        let firstFailureResult: AuthenticationFailure | undefined;
        const challenges: {[schemeName: string]: string | undefined} = {};
        let firstAuthenticatedResult: Dictionary<AuthenticationSuccess> | undefined;

        const triedSchemes : Dictionary<AuthenticationSuccess> = Object.create(null);

        for(const securityRequirement of this.securityRequirements) {
            const securityRequirementResult = await this._checkSecurityRequirement(
                triedSchemes,
                securityRequirement,
                exegesisContext
            );

            if(!securityRequirementResult) {
                break;
            } else if(securityRequirementResult.type === 'authenticated') {
                firstAuthenticatedResult = firstAuthenticatedResult || securityRequirementResult.result;
            } else if(
                securityRequirementResult.type === 'missing' ||
                securityRequirementResult.type === 'invalid'
            ) {
                const failure = securityRequirementResult.failure!;

                // No luck with this security requirement.
                if(failure.status === 401 && failure.challenge) {
                    challenges[securityRequirementResult.failedSchemeName!] = failure.challenge;
                }

                if(securityRequirementResult.type === 'invalid') {
                    firstFailureResult = firstFailureResult || failure;
                    break;
                }
            } else {
                /* istanbul ignore this */
                throw new Error("Invalid result from `_checkSecurityRequirement()`");
            }

            if(exegesisContext.isResponseFinished()) {
                // We're done!
                break;
            }
        }

        if(firstAuthenticatedResult && !firstFailureResult) {
            // Successs!
            return firstAuthenticatedResult;

        } else if(exegesisContext.isResponseFinished()) {
            // Someone already wrote a response.
            return undefined;

        } else {
            const authSchemes = this.securityRequirements
                .map(requirement => {
                    const schemes = Object.keys(requirement);
                    return schemes.length === 1 ? schemes[0] : `(${schemes.join(' + ')})`;
                });

            const authChallenges = ld(this.securityRequirements)
                .map((requirement: any) : string[] => Object.keys(requirement))
                .flatten()
                .map((schemeName: string) =>
                    challenges[schemeName] || this._securitySchemes.getChallenge(schemeName)
                )
                .filter(challenge => challenge !== undefined)
                .value() as string[];

            const message = (firstFailureResult && firstFailureResult.message) ||
                `Must authenticate using one of the following schemes: ${authSchemes.join(', ')}.`;

            exegesisContext.res
                .setStatus((firstFailureResult && firstFailureResult.status) || 401)
                .set('WWW-Authenticate', authChallenges)
                .setBody({message});

            return undefined;
        }
    }
}