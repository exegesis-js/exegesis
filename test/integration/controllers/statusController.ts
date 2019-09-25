import { ExegesisContext } from "../../../src";

export function setStatus(context: ExegesisContext) {
    context.res.setStatus(400);
}

export function status(context: ExegesisContext) {
    context.res.status(400);
}