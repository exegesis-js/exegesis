import { ExegesisContext } from "../../../src";

export function postWithDefault(context: ExegesisContext) {
    const {name} = context.body;
    return {greeting: `Hello, ${name}!`};
}