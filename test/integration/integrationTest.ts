import * as http from 'http';
import * as path from 'path';
import { makeFetch } from 'supertest-fetch';
import * as exegesis from '../../src';

async function createServer() {
    const options : exegesis.ExegesisOptions = {
        controllers: path.resolve(__dirname, './controllers'),
        controllersPattern: "**/*.@(ts|js)"
    };

    const middleware = await exegesis.compileApi(
        path.resolve(__dirname, './openapi.yaml'),
        options
    );

    const server = http.createServer(
        (req, res) =>
            middleware!(req, res, (err) => {
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
        this.server.close();
    });

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