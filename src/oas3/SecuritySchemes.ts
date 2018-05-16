import ld from 'lodash';
import * as oas3 from 'openapi3-ts';
import { AuthenticatorInfo } from '..';

export default class SecuritySchemes {
    private readonly _securitySchemes: {[securityScheme: string]: oas3.SecuritySchemeObject};
    private readonly _challenges: {[securityScheme: string]: string | undefined};
    private readonly _infos: {[securityScheme: string]: AuthenticatorInfo};

    constructor(openApiDoc: oas3.OpenAPIObject) {
        this._securitySchemes = openApiDoc.components && openApiDoc.components.securitySchemes || {};

        this._challenges = ld.mapValues(this._securitySchemes, scheme => {
            if(scheme.type === 'http') {
                return scheme.scheme || 'Basic';
            }
            if(scheme.type === 'oauth2' || scheme.type === 'openIdConnect') {
                return 'Bearer';
            }
            return undefined;
        });

        this._infos = ld.mapValues(this._securitySchemes, scheme => {
            if(scheme.type === 'apiKey') {
                return {
                    in: (scheme.in as any),
                    name: scheme.name
                };
            } else if(scheme.type === 'http') {
                return {
                    scheme: scheme.scheme
                };
            } else {
                return {};
            }
        });
    }

    getChallenge(schemeName: string) : string | undefined {
        return this._challenges[schemeName];
    }

    getInfo(schemeName: string) : AuthenticatorInfo {
        return this._infos[schemeName];
    }

}