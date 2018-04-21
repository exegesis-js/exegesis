import pb from 'promise-breaker';
import { Controller, ExegesisContext } from "../types";

export function invokeController(
    controller: Controller,
    context: ExegesisContext
) : Promise<any> {
    return pb.apply(controller, null, [context]);
}
