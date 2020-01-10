import { ApiInterface, ResolvedPath } from '../../src';
import http from 'http';
import { Controller } from '../../lib/types';

export class FakeApiInterface implements ApiInterface<void> {
    controller: Controller;
    constructor(controller: Controller) {
        this.controller = controller;
    }

    resolve(
        _method: string,
        url: string,
        _headers: http.IncomingHttpHeaders
    ): ResolvedPath<void> | undefined {
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
            path: url,
            baseUrl: '',
        };

        return path;
    }
}
