import Operation from './Operation';

import Oas3CompileContext from './Oas3CompileContext';
import * as oas3 from 'openapi3-ts';
import Parameter from './Parameter';
import { EXEGESIS_CONTROLLER } from './extensions';

// CONNECT not included, as it is not valid for OpenAPI 3.0.1.
export const HTTP_METHODS = [
    'get',
    'head',
    'post',
    'put',
    'delete',
    'options',
    'trace',
    'patch',
] as const;

interface OperationsMap {
    [key: string]: Operation;
}

export default class Path {
    readonly context: Oas3CompileContext;
    readonly oaPath: oas3.PathItemObject;
    private readonly _operations: OperationsMap;

    constructor(
        context: Oas3CompileContext,
        oaPath: oas3.PathItemObject,
        exegesisController: string | undefined
    ) {
        this.context = context;
        if (oaPath.$ref) {
            this.oaPath = context.resolveRef(oaPath.$ref) as oas3.PathItemObject;
        } else {
            this.oaPath = oaPath;
        }
        const parameters = (oaPath.parameters || []).map(
            (p, i) => new Parameter(context.childContext(['parameters', '' + i]), p)
        );

        exegesisController = oaPath[EXEGESIS_CONTROLLER] || exegesisController;
        this._operations = HTTP_METHODS.reduce((result: OperationsMap, method) => {
            const operation = oaPath[method];
            if (operation) {
                result[method] = new Operation(
                    context.childContext(method),
                    operation,
                    oaPath,
                    method,
                    exegesisController,
                    parameters
                );
            }
            return result;
        }, Object.create(null));
    }

    getOperation(method: string): Operation | undefined {
        return this._operations[method.toLowerCase()];
    }
}
