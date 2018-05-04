import pb from 'promise-breaker';
import { Controller, ExegesisContext, ControllerModule } from "../types";

export function invokeController(
    controllerModule: ControllerModule,
    controller: Controller,
    context: ExegesisContext
) : Promise<any> {
    return pb.apply(controller, controllerModule, [context]);
}
