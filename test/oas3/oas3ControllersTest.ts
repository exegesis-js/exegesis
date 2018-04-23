import ld from 'lodash';
import oas3 from 'openapi3-ts';
import { expect } from 'chai';
import OpenApi from '../../src/oas3/OpenApi';
import { compileOptions } from '../../src/options';
import { jsonPointerToPath } from '../../src/utils/jsonPaths';
import { invokeController } from '../../src/controllers/invoke';
import { ExegesisContext } from '../../src';

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
        op() {return 7;}
    }
};

const options = compileOptions({controllers});

async function findControllerTest(method: string, controllerLocation: string, operationLocation: string) {
    const context: ExegesisContext = ({} as any);
    const openApiDoc = generateOpenApi();
    ld.set(openApiDoc, jsonPointerToPath(controllerLocation), 'myController');
    ld.set(openApiDoc, jsonPointerToPath(operationLocation), 'op');

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
    expect(await invokeController(resolved!.operation!.controller!, context)).to.equal(7);
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
});
