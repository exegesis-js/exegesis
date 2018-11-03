import 'mocha';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as oas3 from 'openapi3-ts';

import Operation from '../../src/oas3/Operation';
import Oas3CompileContext from '../../src/oas3/Oas3CompileContext';
import { makeOpenApiDoc } from '../fixtures';
import { ExegesisOptions } from '../../src';
import { compileOptions } from '../../src/options';
import FakeExegesisContext from '../fixtures/FakeExegesisContext';

chai.use(chaiAsPromised);
const {expect} = chai;

const BASIC_AUTH_SUCCESS_RESULT =  { type: "success", user: 'benbria' };
const DEFAULT_OAUTH_RESULT = {type: 'success', user: 'benbria', scopes: ['admin']};

function makeOperation(
    method: string,
    operation: oas3.OperationObject,
    opts: {
        openApiDoc?: any,
        options?: ExegesisOptions
    } = {}
) {
    const openApiDoc = makeOpenApiDoc();

    openApiDoc.components = openApiDoc.components || {};
    openApiDoc.components.securitySchemes = {
        basicAuth: {type: 'http', scheme: 'Basic'},
        oauth: {type: 'oauth2', flows: {}}
    };

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
                    {oauth: ['admin']}
                ]
            };

            this.exegesisContext = new FakeExegesisContext();

        });

        it('should identify the security requirements for an operation', function() {
            const operation: Operation = makeOperation('get', this.operation);

            expect(operation.securityRequirements).to.eql([
                {oauth: ['admin']}
            ]);
        });

        it('should identify the security requirements for an operation from root', function() {
            delete this.operation.security;
            const operation: Operation = makeOperation('get', this.operation, {
                openApiDoc: {
                    security: [{basicAuth: []}]
                }
            });

            expect(operation.securityRequirements).to.eql([{basicAuth: []}]);
        });

        it('should override the security requirements for an operation', function() {
            const operation: Operation = makeOperation('get', this.operation, {
                openApiDoc: {security: [{basicAuth: []}]}
            });

            expect(operation.securityRequirements).to.eql([
                {oauth: ['admin']}
            ]);
        });

        it('should error if an op requires a security scheme without a configured authenticator', function() {
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
                    oauth() {return undefined;}
                }
            };

            const operation: Operation = makeOperation('get', this.operation, {options});
            await operation.authenticate(this.exegesisContext);
            expect(this.exegesisContext.res.statusCode).to.equal(401);
            expect(this.exegesisContext.res.body).to.eql({
                message: 'Must authenticate using one of the following schemes: oauth.'
            });
            expect(this.exegesisContext.res.headers['www-authenticate']).to.eql(['Bearer']);
        });

        it('should set response message to failed authenticator message if set', async function() {
            const options = {
                authenticators: {
                    oauth() {return { type: 'invalid', message: 'Bearer token expired'};}
                }
            };

            const operation: Operation = makeOperation('get', this.operation, {options});
            await operation.authenticate(this.exegesisContext);
            expect(this.exegesisContext.res.statusCode).to.equal(401);
            expect(this.exegesisContext.res.body).to.eql({
                message: 'Bearer token expired'
            });
            expect(this.exegesisContext.res.headers['www-authenticate']).to.eql(['Bearer']);
        });

        it('should fail to auth an incoming request if the user does not have the correct scopes', async function() {
            this.operation.security = [
                {oauth: ['scopeYouDontHave']}
            ];
            const operation: Operation = makeOperation('get', this.operation);
            await operation.authenticate(this.exegesisContext);
            expect(this.exegesisContext.res.statusCode).to.equal(403);
            expect(this.exegesisContext.res.body).to.eql({
                message: "Authenticated using 'oauth' but missing required scopes: scopeYouDontHave."
            });
        });

        it('should always authenticate a request with no security requirements', async function() {
            const options = {
                authenticators: {
                    oauth() {return undefined;}
                }
            };
            this.operation.security = [];

            const operation: Operation = makeOperation('get', this.operation, {options});
            const authenticated = await operation.authenticate(this.exegesisContext);
            expect(authenticated).to.eql({});
        });

        describe('Security schemes combined via OR', async function() {
            it('should return result of first successful authenticator', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {
                            return BASIC_AUTH_SUCCESS_RESULT;
                        },
                        oauth() {
                            return DEFAULT_OAUTH_RESULT;
                        }
                    }
                };

                const op: oas3.OperationObject = {
                    responses: {200: {description: "ok"}},
                    security: [
                        {basicAuth: []},
                        {oauth: ['admin']},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.exist;
                expect(authenticated).to.eql({
                    basicAuth: BASIC_AUTH_SUCCESS_RESULT
                });
            });

            it('should authenticate a request if a missing result encountered with a success', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {
                            return { type: 'missing'};
                        },
                        oauth() {
                            return DEFAULT_OAUTH_RESULT;
                        }
                    }
                };

                const op: oas3.OperationObject = {
                    responses: {200: {description: "ok"}},
                    security: [
                        {basicAuth: []},
                        {oauth: ['admin']},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.exist;
                expect(authenticated).to.eql({
                    oauth: DEFAULT_OAUTH_RESULT
                });
            });

            it('should not authenticate a request if an invalid result encountered before a success', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {
                            return {type: 'invalid'};
                        },
                        oauth() {
                            return DEFAULT_OAUTH_RESULT;
                        }
                    }
                };

                const op: oas3.OperationObject = {
                    responses: {200: {description: "ok"}},
                    security: [
                        {basicAuth: []},
                        {oauth: ['admin']},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.not.exist;
                expect(this.exegesisContext.res.statusCode).to.equal(401);
                expect(this.exegesisContext.res.body).to.eql({
                    message: 'Must authenticate using one of the following schemes: basicAuth, oauth.'
                });
                expect(this.exegesisContext.res.headers['www-authenticate']).to.eql(['Basic', 'Bearer']);
            });

            it('should not authenticate a request if an invalid result encountered after a success', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {
                            return BASIC_AUTH_SUCCESS_RESULT;
                        },
                        oauth() {
                            return {type: 'invalid'};
                        }
                    }
                };

                const op: oas3.OperationObject = {
                    responses: {200: {description: "ok"}},
                    security: [
                        {basicAuth: []},
                        {oauth: ['admin']},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.not.exist;
                expect(this.exegesisContext.res.statusCode).to.equal(401);
                expect(this.exegesisContext.res.body).to.eql({
                    message: 'Must authenticate using one of the following schemes: basicAuth, oauth.'
                });
                expect(this.exegesisContext.res.headers['www-authenticate']).to.eql(['Basic', 'Bearer']);
            });

            it('should set message from first authenticator if it all results are invalid', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {
                            return {type: 'invalid', message:'Invalid details'};
                        },
                        oauth() {
                            return {type: 'invalid', message:'Token expired'};
                        }
                    }
                };

                const op: oas3.OperationObject = {
                    responses: {200: {description: "ok"}},
                    security: [
                        {basicAuth: []},
                        {oauth: ['admin']},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.not.exist;
                expect(this.exegesisContext.res.statusCode).to.equal(401);
                expect(this.exegesisContext.res.body).to.eql({
                    message:'Invalid details'
                });
                expect(this.exegesisContext.res.headers['www-authenticate']).to.eql(['Basic', 'Bearer']);
            });
        });

        describe('Security schemes combined via AND', async function() {
            it('should authenticate an incoming request if all authenticators succeed', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {return BASIC_AUTH_SUCCESS_RESULT;},
                        oauth() {return DEFAULT_OAUTH_RESULT;}
                    }
                };

                const op :oas3.OperationObject= {
                    responses: {200: {description: "ok"}},
                    security: [
                        {oauth: [], basicAuth: [],},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.exist;
                expect(authenticated).to.eql({
                    basicAuth: BASIC_AUTH_SUCCESS_RESULT,
                    oauth: DEFAULT_OAUTH_RESULT
                });
            });

            it('should not authenticate an incoming request if one of the results is missing', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {return { type: 'missing' };},
                        oauth() {return DEFAULT_OAUTH_RESULT;}
                    }
                };

                const op :oas3.OperationObject= {
                    responses: {200: {description: "ok"}},
                    security: [
                        {oauth: [], basicAuth: [],},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.not.exist;
                expect(this.exegesisContext.res.statusCode).to.equal(401);
                expect(this.exegesisContext.res.body).to.eql({
                    message: 'Must authenticate using one of the following schemes: (oauth + basicAuth).'
                });
                expect(this.exegesisContext.res.headers['www-authenticate']).to.eql(['Bearer', 'Basic']);
            });

            it('should not authenticate an incoming request if one of the results is invalid', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {return BASIC_AUTH_SUCCESS_RESULT;},
                        oauth() {return { type: 'invalid' };}
                    }
                };

                const op :oas3.OperationObject= {
                    responses: {200: {description: "ok"}},
                    security: [
                        {oauth: [], basicAuth: [],},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.not.exist;
                expect(this.exegesisContext.res.statusCode).to.equal(401);
                expect(this.exegesisContext.res.body).to.eql({
                    message: 'Must authenticate using one of the following schemes: (oauth + basicAuth).'
                });
                expect(this.exegesisContext.res.headers['www-authenticate']).to.eql(['Bearer', 'Basic']);
            });

            it('should set message from first authenticator if it all results are invalid', async function() {
                const options = {
                    authenticators: {
                        basicAuth() {
                            return {type: 'invalid', message:'Invalid details'};
                        },
                        oauth() {
                            return {type: 'invalid', message:'Token expired'};
                        }
                    }
                };

                const op: oas3.OperationObject = {
                    responses: {200: {description: "ok"}},
                    security: [
                        {oauth: [], basicAuth: [],},
                    ]
                };

                const operation: Operation = makeOperation('get', op, {options});
                const authenticated = await operation.authenticate(this.exegesisContext);
                expect(authenticated).to.not.exist;
                expect(this.exegesisContext.res.statusCode).to.equal(401);
                expect(this.exegesisContext.res.body).to.eql({
                    message:'Token expired'
                });
                expect(this.exegesisContext.res.headers['www-authenticate']).to.eql(['Bearer', 'Basic']);
            });
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

        it('should include raw Ajv response in error', function() {
            const operation = makeOperation('get', {
                responses: {200: {description: "ok"}},
                parameters: [{
                    name: 'myparam',
                    in: 'query',
                    schema: {type: 'string'}
                }]
            });

            const invalid = {
                query: {myparam: {foo: 'bar'}},
                header: {},
                server: {},
                path: {},
                cookie: {}
            };
            const errors = operation.validateParameters(invalid);
            expect(errors).to.not.be.null;
            if(errors) {
                expect(errors[0]).to.have.property('ajvError');
            }
        });

        it('should generate a map of parameter locations', function() {
            const operation = makeOperation('get', {
                responses: {200: {description: "ok"}},
                parameters: [{
                    name: 'myparam',
                    in: 'query',
                    schema: {type: 'string'}
                }]
            });

            expect(operation.parameterLocations).to.eql({
                cookie: {},
                header: {},
                path: {},
                query: {
                    docPath: '/paths/~1path/get/parameters/0',
                    in: 'query',
                    name: 'myparam',
                    path: ''
                }
            });
        });
    });

    describe('validate response body', function() {
        const DEFAULT_RESPONSE = {
            description: "Unexpected error",
            content: {
                "application/json": {
                    schema: {
                        type: 'object',
                        required: ['message'],
                        properties: {message: {type: 'string'}}
                    }
                }
            }
        };

        it('should correctly validate a response that does not expect a body', function() {
            const operation = makeOperation('delete', {
                responses: {
                    200: {description: "ok"},
                    default: DEFAULT_RESPONSE
                },
            });

            const result = operation.validateResponse({
                statusCode: 200,
                headers: {},
                body: undefined
            } as any, false);

            expect(result.errors).to.equal(null);
        });

    });
});