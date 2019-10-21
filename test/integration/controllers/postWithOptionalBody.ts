import { ExegesisContext } from "../../../src";

export function postWithOptionalBody(context: ExegesisContext) {
    const hasBody = !!context.requestBody;
    return { hasBody };
}