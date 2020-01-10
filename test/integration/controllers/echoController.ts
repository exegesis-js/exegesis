import * as exegesis from '../../../src';

export function echo(context: exegesis.ExegesisContext) {
    return context.req.body;
}
