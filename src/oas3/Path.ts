import Operation from './Operation';

import Oas3Context from './Oas3Context';

import * as oas3 from 'openapi3-ts';
import {HTTP_METHODS} from '../types/common';
import Parameter from './Parameter';
import { EXEGESIS_CONTROLLER } from './extensions';

interface OperationsMap {
    [key: string]: Operation;
}

export default class Path {
    readonly context: Oas3Context;
    readonly oaPath: oas3.PathItemObject;
    private readonly _operations: OperationsMap;

    constructor(context: Oas3Context, oaPath: oas3.PathItemObject, exegesisController: string | undefined) {
        this.context = context;
        if(oaPath.$ref) {
            this.oaPath = context.resolveRef(oaPath.$ref) as oas3.PathItemObject;
        } else {
            this.oaPath = oaPath;
        }
        const parameters = (oaPath.parameters || [])
            .map((p, i) => new Parameter(context.childContext(['parameters', '' + i]), p));

        exegesisController = oaPath[EXEGESIS_CONTROLLER] || exegesisController;
        this._operations = HTTP_METHODS
            .map(method => method.toLowerCase())
            .filter(method => oaPath[method])
            .reduce(
                (result: OperationsMap, method: string) => {
                    result[method] = new Operation(
                        context.childContext(method),
                        oaPath[method],
                        oaPath,
                        exegesisController,
                        parameters
                    );
                    return result;
                },
                Object.create(null)
            );
    }

    getOperation(method: string) : Operation | undefined {
        return this._operations[method.toLowerCase()];
    }
}