import { ExegesisContext } from "../core/ExegesisContext";
import { Callback } from "../types/common";

export type PromiseController = (context: ExegesisContext) => any;
export type CallbackController = (context: ExegesisContext, done: Callback<any>) => void;

export type Controller = CallbackController | PromiseController;

export interface ControllerModule {
    [operationId: string]: Controller;
}

export interface Controllers {
    // controllerName can have "/"s in it.
    [controllerName: string]: ControllerModule;
}
