import ld from 'lodash';
import { IncomingHttpHeaders } from 'http';
import oas3 from 'openapi3-ts';
import { expect } from 'chai';
import * as jsonPtr from 'json-ptr';
import OpenApi from '../../src/oas3/OpenApi';
import { compileOptions } from '../../src/options';
import { invokeController } from '../../src/controllers/invoke';
import { EXEGESIS_CONTROLLER, EXEGESIS_OPERATION_ID } from '../../src/oas3/extensions';
import FakeExegesisContext from '../fixtures/FakeExegesisContext';

// "Integration tests" which check to veryify we can match a path and extract
// various kinds of parameters correctly.

function generateOpenApi(): oas3.OpenAPIObject {
    return {
        openapi: '3.0.1',
        info: {
            title: 'Test API',
            version: '1.0.0',
        },
        paths: {
            '/path': {
                get: {
                    responses: {
                        default: { description: 'hello' },
                    },
                },
                post: {
                    responses: {
                        default: { description: 'hello' },
                    },
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { type: 'object' },
                            },
                        },
                    },
                },
            },
        },
    };
}

const controllers = {
    myController: {
        otherOp() {
            return 7;
        },
        op() {
            return this.otherOp();
        },
    },
};

const options = compileOptions({
    controllers,
    allowMissingControllers: true,
});

async function findControllerTest(
    method: string,
    controllerLocation: string,
    operationLocation: string,
    headers?: IncomingHttpHeaders
) {
    const context = new FakeExegesisContext();
    const openApiDoc = generateOpenApi();
    ld.set(openApiDoc, jsonPtr.JsonPointer.decode(controllerLocation), 'myController');
    ld.set(openApiDoc, jsonPtr.JsonPointer.decode(operationLocation), 'op');

    const openApi = new OpenApi(openApiDoc, options);

    const resolved = openApi.resolve(
        method,
        '/path',
        headers || (method === 'POST' ? { 'content-type': 'application/json' } : {})
    );

    expect(
        {
            controllerName: resolved!.operation!.exegesisControllerName,
            operationId: resolved!.operation!.operationId,
        },
        `controller: ${controllerLocation}, operation: ${operationLocation}`
    ).to.eql({
        controllerName: 'myController',
        operationId: 'op',
    });
    expect(
        await invokeController(
            resolved!.operation!.controllerModule!,
            resolved!.operation!.controller!,
            context
        )
    ).to.equal(7);
}

describe('oas3 integration controller extensions', function () {
    it('should resolve controller and operationId with body', async function () {
        const EXEGESIS_CONTROLLER_LOCATIONS = [
            '/x-exegesis-controller',
            '/paths/x-exegesis-controller',
            '/paths/~1path/x-exegesis-controller',
            '/paths/~1path/post/x-exegesis-controller',
            '/paths/~1path/post/requestBody/content/application~1json/x-exegesis-controller',
        ];

        const EXEGESIS_OPERATION_LOCATIONS = [
            '/paths/~1path/post/x-exegesis-operationId',
            '/paths/~1path/post/operationId',
            '/paths/~1path/post/requestBody/content/application~1json/x-exegesis-operationId',
        ];

        for (const controllerLocation of EXEGESIS_CONTROLLER_LOCATIONS) {
            for (const operationLocation of EXEGESIS_OPERATION_LOCATIONS) {
                await findControllerTest('POST', controllerLocation, operationLocation);
            }
        }
    });

    it('should resolve controller and operationId without body', async function () {
        const EXEGESIS_CONTROLLER_LOCATIONS = [
            '/x-exegesis-controller',
            '/paths/x-exegesis-controller',
            '/paths/~1path/x-exegesis-controller',
            '/paths/~1path/get/x-exegesis-controller',
        ];

        const EXEGESIS_OPERATION_LOCATIONS = [
            '/paths/~1path/get/x-exegesis-operationId',
            '/paths/~1path/get/operationId',
        ];

        for (const controllerLocation of EXEGESIS_CONTROLLER_LOCATIONS) {
            for (const operationLocation of EXEGESIS_OPERATION_LOCATIONS) {
                await findControllerTest('get', controllerLocation, operationLocation);
            }
        }
    });

    it('should resolve controller and operationId without body and ignore the content-type header', async function () {
        const EXEGESIS_CONTROLLER_LOCATIONS = [
            '/x-exegesis-controller',
            '/paths/x-exegesis-controller',
            '/paths/~1path/x-exegesis-controller',
            '/paths/~1path/get/x-exegesis-controller',
        ];

        const EXEGESIS_OPERATION_LOCATIONS = [
            '/paths/~1path/get/x-exegesis-operationId',
            '/paths/~1path/get/operationId',
        ];

        for (const controllerLocation of EXEGESIS_CONTROLLER_LOCATIONS) {
            for (const operationLocation of EXEGESIS_OPERATION_LOCATIONS) {
                await findControllerTest('get', controllerLocation, operationLocation, {
                    'content-type': 'application/json',
                });
            }
        }
    });

    it('should throw an error if there is no content-type header in a POST request', function () {
        const openApiDoc = generateOpenApi();
        const openApi = new OpenApi(openApiDoc, options);
        expect(() => openApi.resolve('post', '/path', {})).to.throw(
            'Missing content-type. Expected one of: application/json'
        );
    });

    it('should throw an error in a post request with body but invalid content-type', function () {
        const openApiDoc = generateOpenApi();
        const openApi = new OpenApi(openApiDoc, options);
        expect(() =>
            openApi.resolve('post', '/path', {
                'content-type': 'application/jsontypo',
                'content-length': '442',
            })
        ).to.throw('Invalid content-type: application/jsontypo');
    });

    it('should throw an error in a post request without body but invalid content-type', function () {
        const openApiDoc = generateOpenApi();
        const openApi = new OpenApi(openApiDoc, options);
        expect(() =>
            openApi.resolve('post', '/path', {
                'content-type': 'application/jsontypo',
            })
        ).to.throw('Invalid content-type: application/jsontypo');
    });

    it('should not an error in a get request with invalid content-type', function () {
        const openApiDoc = generateOpenApi();
        const openApi = new OpenApi(openApiDoc, options);
        expect(
            openApi.resolve('get', '/path', {
                'content-type': 'application/jsontypo',
            })
        ).to.be.ok;
    });

    it('should throw an error in a post request without (optional) body but invalid content-type', function () {
        const openApiDoc = generateOpenApi();
        openApiDoc.paths['/path'].post.requestBody.required = false;
        const openApi = new OpenApi(openApiDoc, options);
        expect(() =>
            openApi.resolve('post', '/path', {
                'content-type': 'application/jsontypo',
            })
        ).to.throw('Invalid content-type: application/jsontypo');
    });

    it('should resolve even if there is no controller', function () {
        const openApiDoc = generateOpenApi();
        const openApi = new OpenApi(openApiDoc, options);

        const resolved = openApi.resolve('POST', '/path', { 'content-type': 'application/json' });

        expect({
            controllerName: resolved!.operation!.exegesisControllerName,
            operationId: resolved!.operation!.operationId,
            controller: resolved!.operation!.controller,
        }).to.eql({
            controllerName: undefined,
            operationId: undefined,
            controller: undefined,
        });
    });

    it('should throw an error if there is a controller defined, but it does not exist', function () {
        const openApiDoc = generateOpenApi();
        openApiDoc.paths['/path'].get[EXEGESIS_CONTROLLER] = 'idonotexist';
        openApiDoc.paths['/path'].get.operationId = 'idonotexist';

        expect(() => new OpenApi(openApiDoc, options)).to.throw(
            'Could not find controller idonotexist defined in /paths/~1path/get'
        );
    });

    it('should throw an error if there is an operationId defined, but it does not exist', function () {
        const openApiDoc = generateOpenApi();
        openApiDoc.paths['/path'].get[EXEGESIS_CONTROLLER] = 'myController';
        openApiDoc.paths['/path'].get.operationId = 'idonotexist';

        expect(() => new OpenApi(openApiDoc, options)).to.throw(
            'Could not find operation myController#idonotexist defined in /paths/~1path/get'
        );
    });

    it('should return undefined if there is no path to resolve', function () {
        const openApiDoc = generateOpenApi();
        const openApi = new OpenApi(openApiDoc, options);

        const resolved = openApi.resolve('POST', 'badpath', { 'content-type': 'application/json' });
        expect(resolved).to.be.undefined;
    });

    it('should throw an error if there is no openapi version field', function () {
        const openApiDoc = generateOpenApi();
        delete openApiDoc['openapi'];
        expect(() => new OpenApi(openApiDoc, options)).to.throw(
            "OpenAPI definition is missing 'openapi' field"
        );
    });

    it('should throw an error if the openapi version is invalid', function () {
        const openApiDoc = generateOpenApi();
        openApiDoc['openapi'] = '2.0.0';
        expect(() => new OpenApi(openApiDoc, options)).to.throw(
            'OpenAPI version 2.0.0 not supported'
        );
    });

    it('should utilize the servers field', async function () {
        const openApiDoc = generateOpenApi();
        openApiDoc.servers = [{ url: '/basepath' }];
        const openApi = new OpenApi(openApiDoc, options);
        const resolved = openApi.resolve('get', '/basepath/path', {});
        expect(resolved).to.be.ok;
        const resolved2 = openApi.resolve('get', '/path', {});
        expect(resolved2).to.be.not.ok;
    });

    describe('allowMissingControllers: false', function () {
        const options2 = compileOptions({
            controllers,
            allowMissingControllers: false,
        });

        it('should error if an operation has no controller defined', function () {
            const openApiDoc = generateOpenApi();
            expect(() => new OpenApi(openApiDoc, options2)).to.throw(
                `Missing ${EXEGESIS_CONTROLLER} for /paths/~1path/get`
            );
        });

        it('should error if an operation has no operationId', function () {
            const openApiDoc = generateOpenApi();
            openApiDoc.paths['/path'].get[EXEGESIS_CONTROLLER] = 'myController';
            expect(() => new OpenApi(openApiDoc, options2)).to.throw(
                `Missing operationId or ${EXEGESIS_OPERATION_ID} for /paths/~1path/get`
            );
        });
    });
});
