import pb from 'promise-breaker';
import { Controller, ExegesisContext, ControllerModule } from "../types";
import { isReadable } from '../utils/typeUtils';

export function invokeController(
    controllerModule: ControllerModule,
    controller: Controller,
    context: ExegesisContext
) : Promise<any> {
    return pb.apply(controller, controllerModule, [context])
    .then(result => {
        if(!context.res.ended) {
            if(result === undefined || result === null) {
                context.res.end();
            } else if((typeof result === 'string') || (result instanceof Buffer) || isReadable(result)) {
                context.res.setBody(result);
            } else {
                context.res.json(result);
            }
        }

        return result;
    });
}
