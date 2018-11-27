import { expect } from 'chai';
import * as http from 'http';
import * as path from 'path';
import { makeFetch } from 'supertest-fetch';
import * as exegesis from '../../src';

async function sessionAuthenticator(
    context: exegesis.ExegesisPluginContext
): Promise<exegesis.AuthenticationResult | undefined> {
    const session = context.req.headers.session;
    if (!session || typeof session !== 'string') {
        return undefined;
    }
    if (session === 'lame') {
        return {
            type: 'success',
            user: { name: 'Mr. Lame' },
            roles: [],
        };
    } else if (session === 'secret') {
        return {
            type: 'success',
            user: { name: 'jwalton' },
            roles: ['readWrite', 'admin'],
        };
    } else {
        throw context.makeError(403, 'Invalid session.');
    }
}

async function createServer(options: exegesis.ExegesisOptions) {
    const middleware = await exegesis.compileApi(
        path.resolve(__dirname, './openapi.yaml'),
        options
    );

    const server = http.createServer((req, res) =>
        middleware!(req, res, err => {
            // if(err instanceof exegesis.ValidationError) {
            //     res.writeHead(err.status);
            //     res.end(JSON.stringify({message: err.message, errors: err.errors}));
            // } else if(err instanceof exegesis.HttpError) {
            //     res.writeHead(err.status);
            //     res.end(JSON.stringify({message: err.message}));
            // } else if(err) {
            if (err) {
                console.error(err.stack); // tslint:disable-line no-console
                res.writeHead(500);
                res.end(`Internal error: ${err.message}`);
            } else {
                res.writeHead(404);
                res.end();
            }
        })
    );

    return server;
}

describe('integration test', function() {
    beforeEach(async function() {
        this.server = await createServer({
            controllers: path.resolve(__dirname, './controllers'),
            authenticators: {
                sessionKey: sessionAuthenticator,
            },
            controllersPattern: '**/*.@(ts|js)',
        });
    });

    afterEach(function() {
        if (this.server) {
            this.server.close();
        }
    });

    describe('parameters', function() {
        it('should succesfully call an API', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/greet?name=Jason`)
                .expect(200)
                .expect('content-type', 'application/json')
                .expectBody({ greeting: 'Hello, Jason!' });
        });

        it('should return an error for missing parameters', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/greet`)
                .expect(400)
                .expect('content-type', 'application/json')
                .expectBody({
                    message: 'Validation errors',
                    errors: [
                        {
                            message: 'Missing required query parameter "name"',
                            location: {
                                docPath: '/paths/~1greet/get/parameters/0',
                                in: 'query',
                                name: 'name',
                                path: '',
                            },
                        },
                    ],
                });
        });

        it('should return an error for invalid parameters', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/greet?name=A`)
                .expect(400)
                .expect('content-type', 'application/json')
                .expectBody({
                    message: 'Validation errors',
                    errors: [
                        {
                            location: {
                                docPath: '/paths/~1greet/get/parameters/0/schema',
                                in: 'query',
                                name: 'name',
                                path: '',
                            },
                            message: 'should NOT be shorter than 2 characters',
                        },
                    ],
                });
        });
    });

    describe('security', function() {
        it('should require authentication from an authenticator', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/secure`)
                .expect(401)
                .expectBody({
                    message: 'Must authenticate using one of the following schemes: sessionKey.',
                });
        });

        it('should return an error from an authenticator', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/secure`, {
                headers: { session: 'wrong' },
            })
                .expect(403)
                .expectBody({ message: 'Invalid session.' });
        });

        it('should authenticate successfully', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/secure`, {
                headers: { session: 'secret' },
            })
                .expect(200)
                .expectBody({
                    security: {
                        sessionKey: {
                            type: 'success',
                            user: { name: 'jwalton' },
                            roles: ['readWrite', 'admin'],
                        },
                    },
                    user: { name: 'jwalton' },
                });
        });
    });

    describe('post', function() {
        it('should post a body', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/postWithDefault`, {
                method: 'post',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name: 'Joe' }),
            })
                .expect(200)
                .expectBody({ greeting: 'Hello, Joe!' });
        });

        it('return an error for invalid content-type', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/postWithDefault`, {
                method: 'post',
                headers: { 'content-type': 'application/xml' },
                body: '<name>Joe</name>',
            })
                .expect(400)
                .expectBody({ message: 'Invalid content-type: application/xml' });
        });

        it('return an error for no body if body is required', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/postWithDefault`, { method: 'post' })
                .expect(400)
                .expectBody({ message: 'Missing content-type. Expected one of: application/json' });
        });
    });

    it('should correctly parse application/x-www-form-urlencoded', async function() {
        const fetch = makeFetch(this.server);
        await fetch(`/wwwFormUrlencoded`, {
            method: 'post',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: 'arr=a,b&other=foo',
        }).expectBody({
            arr: ['a', 'b'],
            other: 'foo',
        });
    });

    describe('response validation', function() {
        let errors = 0;

        beforeEach(async function() {
            errors = 0;

            this.server.close();
            this.server = await createServer({
                controllers: path.resolve(__dirname, './controllers'),
                authenticators: {
                    sessionKey: sessionAuthenticator,
                },
                controllersPattern: '**/*.@(ts|js)',
                onResponseValidationError: () => {
                    errors++;
                },
            });
        });

        it('should identify a bad response', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/malformedResponse`).expect(200);

            expect(errors).to.equal(1);
        });

        it('should not complaint about an OK response', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/greet?name=Jason`).expect(200);

            expect(errors).to.equal(0);
        });
    });
});
