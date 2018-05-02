import 'mocha';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as oas3 from 'openapi3-ts';

import Operation from '../../src/oas3/Operation';
import Oas3CompileContext from '../../src/oas3/Oas3CompileContext';
import { makeOpenApiDoc } from '../fixtures';
import { ExegesisOptions } from '../../src';
import { compileOptions } from '../../src/options';
import { EXEGESIS_ROLES } from '../../src/oas3/extensions';
import FakeExegesisContext from '../fixtures/FakeExegesisContext';

chai.use(chaiAsPromised);
const {expect} = chai;

const DEFAULT_OAUTH_RESULT = {user: 'benbria', roles: ['bacon'], scopes: ['admin']};

function makeOperation(
    method: string,
    operation: oas3.OperationObject,
    opts: {
        openApiDoc?: any,
        options?: ExegesisOptions
    } = {}
) {
    const openApiDoc = makeOpenApiDoc();

    if(opts.openApiDoc) {
        Object.assign(openApiDoc, opts.openApiDoc);
    }

    openApiDoc.paths['/path'] = {
        [method]: operation
    };

    const options = opts.options || {
        authenticators: {
            basicAuth() {return undefined;},
            oauth() {return DEFAULT_OAUTH_RESULT;}
        }
    };

    const context = new Oas3CompileContext(openApiDoc, ['paths', '/path', method], compileOptions(options));
    return new Operation(context, operation, openApiDoc.paths['/path'], method, undefined, []);
}

describe('oas3 Operation', function() {
    describe('security', function() {
        beforeEach(function() {
            this.operation = {
                responses: {200: {description: "ok"}},
                security: [
                    {basicAuth: []},
                    {oauth: ['admin']}
                ],
                [EXEGESIS_ROLES]: ['bacon']
            };

            this.exegesisContext = new FakeExegesisContext();

        });

        it('should identify the security requirements for an operation', function() {
            this.operation[EXEGESIS_ROLES] = ['bacon', 'apples'];
            const operation: Operation = makeOperation('get', this.operation);

            expect(operation.securityRequirements).to.eql([
                {basicAuth: []},
                {oauth: ['admin']}
            ]);
            expect(operation.requiredRoles).to.eql(['bacon', 'apples']);
        });

        it('should identify the security requirements for an operation from root', function() {
            delete this.operation.security;
            delete this.operation[EXEGESIS_ROLES];
            const operation: Operation = makeOperation('get', this.operation, {
                openApiDoc: {
                    security: [
                        {basicAuth: []}
                    ],
                    [EXEGESIS_ROLES]: ['fish']
                }
            });

            expect(operation.securityRequirements).to.eql([
                {basicAuth: []}
            ]);
            expect(operation.requiredRoles).to.eql(['fish']);
        });

        it('should override the security requirements for an operation', function() {
            const operation: Operation = makeOperation('get', this.operation, {
                openApiDoc: {
                    security: [{basicAuth: []}],
                    [EXEGESIS_ROLES]: ['fish']
                }
            });

            expect(operation.securityRequirements).to.eql([
                {basicAuth: []},
                {oauth: ['admin']}
            ]);
            expect(operation.requiredRoles).to.eql(['bacon']);
        });

        it('should error if an op requires a security scheme wihtout a configured authenticator', function() {
            this.operation.security = [{foo: []}];
            expect(
                () => makeOperation('get', this.operation)
            ).to.throw(
                'Operation /paths/~1path/get references security scheme "foo" but no authenticator was provided'
            );
        });

        it('should authenticate an incoming request', async function() {
            const operation: Operation = makeOperation('get', this.operation);
            const authenticated = await operation.authenticate(this.exegesisContext);

            expect(authenticated).to.exist;
            expect(authenticated).to.eql({
                oauth: DEFAULT_OAUTH_RESULT
            });
        });

        it('should fail to authenticate an incoming request if no credentials are provided', async function() {
            const options = {
                authenticators: {
                    basicAuth() {return undefined;},
                    oauth() {return undefined;}
                }
            };

            const operation: Operation = makeOperation('get', this.operation, {options});
            await expect(
                operation.authenticate(this.exegesisContext)
            ).to.be.rejectedWith('Must authenticate using one of the following schemes: basicAuth, oauth');
        });

        it('should fail to auth an incoming request if the user does not have the correct roles', async function() {
            this.operation[EXEGESIS_ROLES] = ['roleYouDontHave'];
            const operation: Operation = makeOperation('get', this.operation);
            await expect(
                operation.authenticate(this.exegesisContext)
            ).to.be.rejectedWith("Authenticated using 'oauth' but missing required roles: roleYouDontHave.");
        });

        it('should fail to auth an incoming request if the user does not have the correct scopes', async function() {
            this.operation.security = [
                {oauth: ['scopeYouDontHave']}
            ];
            const operation: Operation = makeOperation('get', this.operation);
            await expect(
                operation.authenticate(this.exegesisContext)
            ).to.be.rejectedWith("Authenticated using 'oauth' but missing required scopes: scopeYouDontHave.");
        });

        it('should fail to authenticate if user matches one security scheme but not the other', async function() {
            this.operation.security = [{
                basicAuth: [],
                oauth: ['admin']
            }];
            const operation: Operation = makeOperation('get', this.operation);

            await expect(
                operation.authenticate(this.exegesisContext)
            ).to.be.rejectedWith("Must authenticate using one of the following schemes: (basicAuth + oauth).");
        });

        it('should fail to authenticate if user has roles for one security scheme but not the other', async function() {
            this.operation.security = [{
                basicAuth: [],
                oauth: []
            }];
            this.operation[EXEGESIS_ROLES] = ['foo', 'bar'];

            const authenticators = {
                basicAuth() {return {roles: ['foo', 'bar']};},
                oauth() {return {roles: ['foo', 'baz']};}
            };

            const operation: Operation = makeOperation('get', this.operation, {options: {
                authenticators
            }});

            // TODO: This error message could be better.
            await expect(
                operation.authenticate(this.exegesisContext)
            ).to.be.rejectedWith("Authenticated using 'oauth' but missing required roles: bar.");
        });

        it('should always authenticate a request with no security requirements', async function() {
            const options = {
                authenticators: {
                    basicAuth() {return undefined;},
                    oauth() {return undefined;}
                }
            };
            this.operation.security = [];
            this.operation[EXEGESIS_ROLES] = [];

            const operation: Operation = makeOperation('get', this.operation, {options});
            const authenticated = await operation.authenticate(this.exegesisContext);
            expect(authenticated).to.equal(undefined);
        });

        it('should error at compile time if you define an operation with roles but no security', async function() {
            this.operation.security = [];
            this.operation[EXEGESIS_ROLES] = ['role'];

            expect(
                () => makeOperation('get', this.operation)
            ).to.throw('Operation /paths/~1path/get has no security requirements, but requires roles: role');
        });

        it('should error at compile time if x-exegesis-roles is not a an array of strings', async function() {
            this.operation[EXEGESIS_ROLES] = {role: 'roleYouDontHave'};

            expect(
                () => makeOperation('get', this.operation)
            ).to.throw('/paths/~1path/get/x-exegesis-roles must be an array of strings.');
        });
    });

    describe('body', function() {
        it('should generate a MediaType for each content type', function() {
            const operation = makeOperation('post', {
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
            const operation = makeOperation('get', {
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
            const operation = makeOperation('get', {
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