import { ExegesisContext } from "../../../src";

export function postWithDefault(context: ExegesisContext) {
    const {name} = context.requestBody;
    return {greeting: `Hello, ${name}!`};
}