import * as oas3 from 'openapi3-ts';
import { resolveRef } from '../../utils/json-schema-resolve-ref';
import { EXEGESIS_ROLES } from '../extensions';
import { ExegesisPluginContext, OAS3ApiInfo } from '../..';
import { pathToJsonPointer } from '../../utils/jsonPaths';
import { ExegesisPluginInstance } from '../../types/internal';

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE'];

type RequiredRoles = string[][];

// FIXME: Need tests cases for this plugin.

class RolesPlugin implements ExegesisPluginInstance {
    private readonly _rolesForPaths: {[path: string]: RequiredRoles} = {};
    private readonly _securitySchemesTypes: {[path: string]: oas3.SecuritySchemeType} = {};

    constructor(openApiDoc: oas3.OpenAPIObject) {
        const securitySchemes = (openApiDoc.components && openApiDoc.components.securitySchemes) || {};

        for(const securitySchemeName of Object.keys(securitySchemes)) {
            this._securitySchemesTypes[securitySchemeName] = securitySchemes[securitySchemeName].type;
        }

        for(const path of Object.keys(openApiDoc.paths)) {
            const pathItemObject = resolveRef(openApiDoc, openApiDoc.paths[path]);
            for(const method of HTTP_METHODS) {
                const operationObject : oas3.OperationObject = pathItemObject[method.toLowerCase()];
                if(!operationObject) { continue; }

                let requiredRoles = operationObject[EXEGESIS_ROLES] || openApiDoc[EXEGESIS_ROLES];
                if(requiredRoles) {
                    const securityRequirements = operationObject.security || openApiDoc.security;
                    if(!securityRequirements) {
                        throw new Error(`Path ${path} has operation ${method.toLowerCase()} with ` +
                            `required roles but no security requirements.`);
                    }

                    if(!Array.isArray(requiredRoles)) {
                        throw new Error(
                            `Exepected ${EXEGESIS_ROLES} in ${path}/${method.toLowerCase()} to be an array.`
                        );
                    }

                    // Turn it into an array of arrays of strings.
                    if(requiredRoles.every(m => typeof(m) === 'string')) {
                        requiredRoles = [requiredRoles];
                    } else {
                        requiredRoles = requiredRoles.map(m => Array.isArray(m) ? m : [m]);
                    }

                    if(requiredRoles.length > 0) {
                        const pathItemPtr = pathToJsonPointer(['paths', path]);
                        this._rolesForPaths[`${pathItemPtr}/${method.toLowerCase()}`] = requiredRoles;
                    }
                }
            }
        }
    }

    preController(context: ExegesisPluginContext) {
        if(!context.security) {
            // No authenticated users.  We match roles against each
            // authenticated user, so there's no work for us to do here.
            return;
        }

        const api = (context.api as OAS3ApiInfo);
        const method = (context.req.method || '').toLowerCase();
        const requiredRoles = this._rolesForPaths[`${api.pathItemPtr}/${method}`];

        if(requiredRoles) {
            const schemes = Object.keys(context.security)
                .filter(schemeName => {
                    // Roles don't apply to oauth2
                    return this._securitySchemesTypes[schemeName] !== 'oauth2';
                });

            const badSchemes = schemes.filter(scheme => {
                const userRoles = context.security![scheme].roles || [];
                const userAllowed = requiredRoles.some(roles =>
                    roles.every(role => userRoles.includes(role))
                );
                return !userAllowed;
            });

            if(badSchemes.length > 0) {
                // TODO: Improve error message.
                context.res.setStatus(403)
                    .setBody({
                        message: `Authenticated with ${schemes.join(', ')} but missing one or more required roles.`
                    });
            }
        }
    }
}

export function exegesisPlugin(document: any) : ExegesisPluginInstance {
    return new RolesPlugin(document);
}