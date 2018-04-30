import * as http from 'http';
import * as path from 'path';
import { makeFetch } from 'supertest-fetch';
import * as exegesis from '../../src';

async function sessionAuthSecurityPlugin(
    context: exegesis.ExegesisPluginContext
) : Promise<exegesis.ExegesisAuthenticated | undefined> {
    const session = context.req.headers.session;
    if(!session || typeof(session) !== 'string') {
        return undefined;
    }
    if(session !== 'secret') {
        throw context.makeError(403, "Invalid session.");
    }
    return {
        user: {name: 'jwalton'},
        roles: ['readWrite', 'admin']
    };
}

async function createServer() {
    const options : exegesis.ExegesisOptions = {
        controllers: path.resolve(__dirname, './controllers'),
        securityPlugins: {
            sessionKey: sessionAuthSecurityPlugin
        },
        controllersPattern: "**/*.@(ts|js)"
    };

    const middleware = await exegesis.compileApi(
        path.resolve(__dirname, './openapi.yaml'),
        options
    );

    const server = http.createServer(
        (req, res) =>
            middleware!(req, res, (err) => {
                // if(err instanceof exegesis.ValidationError) {
                //     res.writeHead(err.status);
                //     res.end(JSON.stringify({message: err.message, errors: err.errors}));
                // } else if(err instanceof exegesis.HttpError) {
                //     res.writeHead(err.status);
                //     res.end(JSON.stringify({message: err.message}));
                // } else if(err) {
                if(err) {
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

describe('integration', function() {
    beforeEach(async function() {
        this.server = await createServer();
    });

    afterEach(function() {
        if(this.server) {this.server.close();}
    });

    describe('parameters', function() {
        it('should succesfully call an API', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/greet?name=Jason`)
                .expect(200)
                .expect('content-type', 'application/json')
                .expectBody({greeting: 'Hello, Jason!'});
        });

        it('should return an error for missing parameters', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/greet`)
                .expect(400)
                .expect('content-type', 'application/json')
                .expectBody({
                    "message": "Validation errors",
                    "errors": [{
                        "type": "error",
                        "message": "Missing required query parameter \"name\"",
                        "location": {
                            "docPath": ["paths", "/greet", "get", "parameters", "0"],
                            "in": "query",
                            "name": "name",
                            "path": []
                        },
                    }
                    ]
                });
        });
    });

    describe('security', function() {
        it('should require authentication from a security plugin', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/secure`)
                .expect(403)
                .expectBody({message:"Must authenticate using one of the following schemes: sessionKey."});
        });

        it('should return an error from a security plugin', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/secure`, {
                headers: {session: 'wrong'}
            })
                .expect(403)
                .expectBody({message: "Invalid session."});
        });

        it('should require authentication from a security plugin', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/secure`, {
                headers: {session: 'secret'}
            })
                .expect(200)
                .expectBody({
                    sessionKey: {
                        user: {name: 'jwalton'},
                        roles: ['readWrite', 'admin']
                    }
                });
        });
    });

    describe('post', function() {
        it('should post a body', async function() {
            const fetch = makeFetch(this.server);
            await fetch(`/postWithDefault`, {
                method: 'post',
                headers: {"content-type": 'application/json'},
                body: JSON.stringify({name: 'Joe'})
            })
                .expect(200)
                .expectBody({greeting: 'Hello, Joe!'});
        });

    });

});