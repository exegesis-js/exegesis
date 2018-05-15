import ld from 'lodash';
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

function generateOpenApi() : oas3.OpenAPIObject {
    return {
        openapi: '3.0.1',
        info: {
            title: 'Test API',
            version: '1.0.0'
        },
        paths: {
            '/path': {
                get: {
                    responses: {
                        default: {description: 'hello'}
                    }
                },
                post: {
                    responses: {
                        default: {description: 'hello'}
                    },
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {type: 'object'}
                            }
                        }
                    }
                }
            }
        }
    };
}

const controllers = {
    myController: {
        otherOp() {return 7;},
        op() {return this.otherOp();}
    }
};

const options = compileOptions({
    controllers,
    allowMissingControllers: true
});

async function findControllerTest(method: string, controllerLocation: string, operationLocation: string) {
    const context = new FakeExegesisContext();
    const openApiDoc = generateOpenApi();
    ld.set(openApiDoc, jsonPtr.decode(controllerLocation), 'myController');
    ld.set(openApiDoc, jsonPtr.decode(operationLocation), 'op');

    const openApi = new OpenApi(openApiDoc, options);

    const resolved = openApi.resolve(
        method,
        "/path",
        method === 'POST' ? {"content-type": 'application/json'} : {}
    );

    expect({
        controllerName: resolved!.operation!.exegesisControllerName,
        operationId: resolved!.operation!.operationId
    }, `controller: ${controllerLocation}, operation: ${operationLocation}` ).to.eql({
        controllerName: 'myController',
        operationId: 'op'
    });
    expect(await invokeController(
        resolved!.operation!.controllerModule!,
        resolved!.operation!.controller!,
        context
    )).to.equal(7);
}

describe('oas3 integration controller extensions', function() {
    it('should resolve controller and operationId with body', async function() {
        const EXEGESIS_CONTROLLER_LOCATIONS = [
            "/x-exegesis-controller",
            "/paths/x-exegesis-controller",
            "/paths/~1path/x-exegesis-controller",
            "/paths/~1path/post/x-exegesis-controller",
            "/paths/~1path/post/requestBody/content/application~1json/x-exegesis-controller",
        ];

        const EXEGESIS_OPERATION_LOCATIONS = [
            "/paths/~1path/post/x-exegesis-operationId",
            "/paths/~1path/post/operationId",
            "/paths/~1path/post/requestBody/content/application~1json/x-exegesis-operationId",
        ];

        for(const controllerLocation of EXEGESIS_CONTROLLER_LOCATIONS) {
            for(const operationLocation of EXEGESIS_OPERATION_LOCATIONS) {
                await findControllerTest('POST', controllerLocation, operationLocation);
            }
        }
    });

    it('should resolve controller and operationId without body', async function() {
        const EXEGESIS_CONTROLLER_LOCATIONS = [
            "/x-exegesis-controller",
            "/paths/x-exegesis-controller",
            "/paths/~1path/x-exegesis-controller",
            "/paths/~1path/get/x-exegesis-controller",
        ];

        const EXEGESIS_OPERATION_LOCATIONS = [
            "/paths/~1path/get/x-exegesis-operationId",
            "/paths/~1path/get/operationId",
        ];

        for(const controllerLocation of EXEGESIS_CONTROLLER_LOCATIONS) {
            for(const operationLocation of EXEGESIS_OPERATION_LOCATIONS) {
                await findControllerTest('get', controllerLocation, operationLocation);
            }
        }
    });

    it('should resolve even if there is no controller', async function() {
        const openApiDoc = generateOpenApi();
        const openApi = new OpenApi(openApiDoc, options);

        const resolved = openApi.resolve(
            "POST",
            "/path",
            {"content-type": 'application/json'}
        );

        expect({
            controllerName: resolved!.operation!.exegesisControllerName,
            operationId: resolved!.operation!.operationId,
            controller: resolved!.operation!.controller
        }).to.eql({
            controllerName: undefined,
            operationId: undefined,
            controller: undefined
        });
    });

    it('should throw an error if there is a controller defined, but it does not exist', function() {
        const openApiDoc = generateOpenApi();
        openApiDoc.paths['/path'].get[EXEGESIS_CONTROLLER] = 'idonotexist';
        openApiDoc.paths['/path'].get.operationId = 'idonotexist';

        expect(
            () => new OpenApi(openApiDoc, options)
        ).to.throw('Could not find controller idonotexist defined in /paths/~1path/get');
    });

    it('should throw an error if there is an operationId defined, but it does not exist', function() {
        const openApiDoc = generateOpenApi();
        openApiDoc.paths['/path'].get[EXEGESIS_CONTROLLER] = 'myController';
        openApiDoc.paths['/path'].get.operationId = 'idonotexist';

        expect(
            () => new OpenApi(openApiDoc, options)
        ).to.throw('Could not find operation myController#idonotexist defined in /paths/~1path/get');
    });

    describe('allowMissingControllers: false', function() {
        const options2 = compileOptions({
            controllers,
            allowMissingControllers: false
        });

        it('should error if an operation has no controller defined', function() {
            const openApiDoc = generateOpenApi();
            expect(
                () => new OpenApi(openApiDoc, options2)
            ).to.throw(`Missing ${EXEGESIS_CONTROLLER} for /paths/~1path/get`);
        });

        it('should error if an operation has no operationId', function() {
            const openApiDoc = generateOpenApi();
            openApiDoc.paths['/path'].get[EXEGESIS_CONTROLLER] = 'myController';
            expect(
                () => new OpenApi(openApiDoc, options2)
            ).to.throw(`Missing operationId or ${EXEGESIS_OPERATION_ID} for /paths/~1path/get`);
        });
    });
});
