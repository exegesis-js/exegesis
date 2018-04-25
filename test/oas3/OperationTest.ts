import 'mocha';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as oas3 from 'openapi3-ts';

import Operation from '../../src/oas3/Operation';
import Oas3Context from '../../src/oas3/Oas3Context';
import { makeOpenApiDoc } from '../fixtures';
import { ExegesisOptions, ExegesisContext } from '../../src';
import { compileOptions } from '../../src/options';
import { EXEGESIS_ROLES } from '../../src/oas3/extensions';

chai.use(chaiAsPromised);
const {expect} = chai;

function makeOperation(extras: any, method: string, operation: oas3.OperationObject, options?: ExegesisOptions) {
    const openApiDoc = makeOpenApiDoc();

    Object.assign(openApiDoc, extras);

    openApiDoc.paths['/path'] = {
        [method]: operation
    };

    options = options || {
        securityPlugins: [
            {scheme: 'basicAuth', plugin() {return undefined;}},
            {scheme: 'oauth', plugin() {return {user: 'benbria', roles: ['bacon'], scopes: ['admin']};}}
        ]
    };

    const context = new Oas3Context(openApiDoc, ['paths', '/path', method], compileOptions(options));
    return new Operation(context, operation, openApiDoc.paths['/path'], undefined, []);
}

describe('oas3 Operation', function() {
    describe('security', function() {
        beforeEach(function() {
            this.operation = {
                responses: {200: {description: "ok"}},
                security: {
                    basicAuth: [],
                    oauth: ['admin']
                },
                [EXEGESIS_ROLES]: ['bacon']
            };
        });

        it('should correctly identify the security requirements for an operation', function() {
            this.operation[EXEGESIS_ROLES] = ['bacon', 'apples'];
            const operation: Operation = makeOperation({}, 'get', this.operation);
            expect(operation.securitySchemeNames).to.eql(['basicAuth', 'oauth']);
            expect(Object.keys(operation.securityRequirements)).to.eql(['basicAuth', 'oauth']);
            expect(operation.requiredRoles).to.eql(['bacon', 'apples']);
        });

        it('should correctly identify the security requirements for an operation from root', function() {
            delete this.operation.security;
            delete this.operation[EXEGESIS_ROLES];
            const operation: Operation = makeOperation({
                security: {basicAuth: []},
                [EXEGESIS_ROLES]: ['fish']
            }, 'get', this.operation);

            expect(operation.securitySchemeNames).to.eql(['basicAuth']);
            expect(operation.requiredRoles).to.eql(['fish']);
        });

        it('should correctly override the security requirements for an operation', function() {
            const operation: Operation = makeOperation({
                security: {basicAuth: []},
                [EXEGESIS_ROLES]: ['fish']
            }, 'get', this.operation);
            expect(operation.securitySchemeNames).to.eql(['basicAuth', 'oauth']);
            expect(operation.requiredRoles).to.eql(['bacon']);
        });

        it('should error if an operation requires a security scheme that we don not have a plugin for', function() {
            this.operation.security = {foo: []};
            expect(
                () => makeOperation({}, 'get', this.operation)
            ).to.throw(
                'Operation /paths/~1path/get references security scheme "foo" but no security plugin was provided'
            );
        });

        it('should authenticate an incoming request', async function() {
            const operation: Operation = makeOperation({}, 'get', this.operation);
            const authenticated = await operation.authenticate({} as ExegesisContext);
            expect(authenticated).to.exist;
            expect(authenticated!.name).to.equal('oauth');
            expect(authenticated!.roles).to.eql(['bacon']);
            expect(authenticated!.scopes).to.eql(['admin']);
        });

        it('should fail to authenticate an incoming request if no credentials are provided', async function() {
            const options = {securityPlugins: [
                {scheme: 'basicAuth', plugin() {return undefined;}},
                {scheme: 'oauth', plugin() {return undefined;}}
            ]};

            const operation: Operation = makeOperation({}, 'get', this.operation, options);
            await expect(
                operation.authenticate({} as ExegesisContext)
            ).to.be.rejectedWith('Must authorize using one of the following schemes basicAuth, oauth');
        });

        it('should fail to auth an incoming request if the user does not have the correct roles', async function() {
            this.operation[EXEGESIS_ROLES] = ['roleYouDontHave'];
            const operation: Operation = makeOperation({}, 'get', this.operation);
            await expect(
                operation.authenticate({} as ExegesisContext)
            ).to.be.rejectedWith("Authenticated using 'oauth' but missing required roles: roleYouDontHave.");
        });

        it('should fail to auth an incoming request if the user does not have the correct scopes', async function() {
            this.operation.security = {
                oauth: ['scopeYouDontHave']
            };
            const operation: Operation = makeOperation({}, 'get', this.operation);
            await expect(
                operation.authenticate({} as ExegesisContext)
            ).to.be.rejectedWith("Authenticated using 'oauth' but missing required scopes: scopeYouDontHave.");
        });

        it('should always authenticate a request with no security requirements', async function() {
            const options = {securityPlugins: [
                {scheme: 'basicAuth', plugin() {return undefined;}},
                {scheme: 'oauth', plugin() {return undefined;}}
            ]};
            this.operation.security = {};
            this.operation[EXEGESIS_ROLES] = [];

            const operation: Operation = makeOperation({}, 'get', this.operation, options);
            const authenticated = await operation.authenticate({} as ExegesisContext);
            expect(authenticated).to.equal(undefined);
        });

        it('should error at compile time if you define an operation with roles but no security', async function() {
            this.operation.security = {};
            this.operation[EXEGESIS_ROLES] = ['role'];

            expect(
                () => makeOperation({}, 'get', this.operation)
            ).to.throw('Operation /paths/~1path/get has no security requirements, but requires roles: role');
        });

        it('should error at compile time if x-exegesis-roles is not a an array of strings', async function() {
            this.operation[EXEGESIS_ROLES] = {role: 'roleYouDontHave'};

            expect(
                () => makeOperation({}, 'get', this.operation)
            ).to.throw('/paths/~1path/get/x-exegesis-roles must be an array of strings.');
        });

    });

    describe('body', function() {
        it('should generate a MediaType for each content type', function() {
            const operation = makeOperation({}, 'post', {
                responses: {200: {description: "ok"}},
                requestBody: {
                    content: {
                        'application/json': {
                            "x-name": "json",
                            schema: {type: 'object'}
                        },
                        'text/*': {
                            "x-name": "text",
                            schema: {type: 'string'}
                        }
                    }
                }
            });

            const jsonMediaType = operation.getRequestMediaType('application/json');
            expect(jsonMediaType, 'application/json media type').to.exist;
            expect(jsonMediaType!.oaMediaType['x-name']).to.equal('json');

            const plainMediaType = operation.getRequestMediaType('text/plain');
            expect(plainMediaType, 'text/plain media type').to.exist;
            expect(plainMediaType!.oaMediaType['x-name']).to.equal('text');
        });
    });

    describe('parameters', function() {
        it('should generate a parameter parser for parameters', function() {
            const operation = makeOperation({}, 'get', {
                responses: {200: {description: "ok"}},
                parameters: [{
                    name: 'myparam',
                    in: 'query',
                    schema: {type: 'string'}
                }]
            });

            const result = operation.parseParameters({
                headers: undefined,
                rawPathParams: {},
                serverParams: undefined,
                queryString: "myparam=7"
            });

            expect(result).to.eql({
                query: {myparam: '7'},
                header: {},
                server: {},
                path: {},
                cookie: {}
            });
        });

        it('should generate a validator for parameters', function() {
            const operation = makeOperation({}, 'get', {
                responses: {200: {description: "ok"}},
                parameters: [{
                    name: 'myparam',
                    in: 'query',
                    schema: {type: 'string'}
                }]
            });

            expect(operation.validateParameters({
                query: {myparam: '7'},
                header: {},
                server: {},
                path: {},
                cookie: {}
            })).to.equal(null);

            const invalid = {
                query: {myparam: {foo: 'bar'}},
                header: {},
                server: {},
                path: {},
                cookie: {}
            };
            const errors = operation.validateParameters(invalid);
            expect(errors, 'error for bad myparam').to.exist;
            expect(errors!).to.not.be.empty;
        });
    });

});