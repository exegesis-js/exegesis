import { ApiInterface, ResolvedPath } from '../../src';
import { Controller } from '../../lib/types';

export class FakeApiInterface implements ApiInterface<void> {
    controller: Controller;
    constructor(controller: Controller) {
        this.controller = controller;
    }

    resolve(_method: string, url: string): ResolvedPath<void> | undefined {
        const path: ResolvedPath<void> = {
            operation: {
                parseParameters: () => ({
                    query: {},
                    cookie: {},
                    header: {},
                    path: {},
                    server: {},
                }),
                validateParameters: () => null,
                parameterLocations: {
                    query: {},
                    cookie: {},
                    header: {},
                    path: {},
                },
                bodyParser: undefined,
                validateBody: undefined,
                exegesisControllerName: 'test',
                operationId: 'operation',
                controllerModule: undefined,
                controller: this.controller,

                validateResponse: () => ({
                    errors: null,
                    isDefault: false,
                }),

                // Returns the authentication data, or undefined if user could not be authenticated.
                authenticate: () => Promise.resolve(undefined),
            },
            api: void 0,
            allowedMethods: ['get'],
            path: url,
            baseUrl: '',
        };

        return path;
    }
}
