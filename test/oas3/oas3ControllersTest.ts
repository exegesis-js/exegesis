import ld from 'lodash';
import oas3 from 'openapi3-ts';
import { expect } from 'chai';
import OpenApi from '../../src/oas3';
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
                post: {
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

describe('oas3 integration controller extensions', function() {
    it('should resolve controller and operationId', async function() {
        const context: ExegesisContext = ({} as any);

        for(const controllerLocation of EXEGESIS_CONTROLLER_LOCATIONS) {
            for(const operationLocation of EXEGESIS_OPERATION_LOCATIONS) {
                const openApiDoc = generateOpenApi();
                ld.set(openApiDoc, jsonPointerToPath(controllerLocation), 'myController');
                ld.set(openApiDoc, jsonPointerToPath(operationLocation), 'op');

                const openApi = new OpenApi(openApiDoc, options);

                const resolved = openApi.resolve(
                    "POST",
                    "/path",
                    {"content-type": 'application/json'}
                );

                expect({
                    controllerName: resolved!.exegesisControllerName,
                    operationId: resolved!.operationId
                }).to.eql({
                    controllerName: 'myController',
                    operationId: 'op'
                });
                expect(await invokeController(resolved!.controller!, context)).to.equal(7);
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
            controllerName: resolved!.exegesisControllerName,
            operationId: resolved!.operationId,
            controller: resolved!.controller
        }).to.eql({
            controllerName: undefined,
            operationId: undefined,
            controller: undefined
        });
    });
});
