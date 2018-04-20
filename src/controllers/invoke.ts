import pb from 'promise-breaker';
import { ExegesisContext } from "../core/ExegesisContext";
import { Controller } from "./types";

export function invokeController(
    controller: Controller,
    context: ExegesisContext
) : Promise<any> {
    return pb.apply(controller, null, [context]);
}
