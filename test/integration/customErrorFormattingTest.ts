import * as http from 'http';
import * as path from 'path';
import { makeFetch } from 'supertest-fetch';
import * as exegesis from '../../src';
import { handleError } from './customErrorHandler';

async function sessionAuthenticator(
    context: exegesis.ExegesisPluginContext
) : Promise<exegesis.AuthenticationResult | undefined> {
    const session = context.req.headers.session;
    if(!session || typeof(session) !== 'string') {
        return undefined;
    }
    if(session === 'lame') {
        return {
            type: 'success',
            user: {name: 'Mr. Lame'},
            roles: []
        };
    } else if(session === 'secret') {
        return {
            type: 'success',
            user: {name: 'jwalton'},
            roles: ['readWrite', 'admin']
        };
    } else {
        throw context.makeError(403, "Invalid session.");
    }
}

async function createServer() {
    const options : exegesis.ExegesisOptions = {
        controllers: path.resolve(__dirname, './controllers'),
        authenticators: {
            sessionKey: sessionAuthenticator
        },
        controllersPattern: "**/*.@(ts|js)",
        autoHandleHttpErrors: handleError,
    };

    const middleware = await exegesis.compileApi(
        path.resolve(__dirname, './openapi.yaml'),
        options
    );

    return http.createServer(
        (req, res) =>
            middleware!(req, res, (err) => {
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
}

describe('integration test', function() {
    beforeEach(async function() {
        this.server = await createServer();
    });

    afterEach(function() {
        if(this.server) {this.server.close();}
    });

    describe('parameters', function() {
        it('should return an error for missing parameters', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/greet`)
                .expect(400)
                .expect('content-type', 'application/json')
                .expectBody({
                    "message": "Validation errors",
                    "errors": [{
                        "message": "Missing required query parameter \"name\"",
                        "location": {
                            "in": "query",
                            "name": "name",
                            "path": ""
                        },
                        "keyword": "missing",
                    }
                    ]
                });
        });

        it('should return an error for invalid parameters', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/greet?name=A`)
                .expect(400)
                .expect('content-type', 'application/json')
                .expectBody({
                    "message": "Validation errors",
                    "errors": [
                        {
                            "location": {
                                "in": "query",
                                "name": "name",
                                "path": ""
                            },
                            "message": "should NOT be shorter than 2 characters",
                            "keyword": "minLength",
                            "params": {
                                "limit": 2
                            }
                        }
                    ]
                });
        });
    });

    describe('security', function() {
        it('should require authentication from an authenticator', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/secure`)
                .expect(401)
                .expectBody({
                    message: "Must authenticate using one of the following schemes: sessionKey."
                });
        });

        it('should return an error from an authenticator', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/secure`, {
                headers: {session: 'wrong'}
            })
                .expect(403)
                .expectBody({message: "Invalid session."});
        });
    });

    describe('post', function() {
        it('return an error for invalid content-type', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/postWithDefault`, {
                method: 'post',
                headers: {"content-type": 'application/xml'},
                body: '<name>Joe</name>'
            })
                .expect(400)
                .expectBody({message: 'Invalid content-type: application/xml'});
        });

        it('return an error for no body if body is required', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/postWithDefault`, {method: 'post'})
                .expect(400)
                .expectBody({message: 'Missing content-type. Expected one of: application/json'});
        });

        it('return an error for bad json', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/postWithDefault`, {
                method: 'post',
                headers: {"content-type": 'application/json'},
                body: '{'
            })
                .expect(400)
                .expectBody({
                    "message": "Unexpected end of JSON input"
                });
        });
    });
});