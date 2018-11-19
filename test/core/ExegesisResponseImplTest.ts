import { expect } from 'chai';

import ExegesisResponseImpl from '../../lib/core/ExegesisResponseImpl';

describe('ExegesisResponseImpl', () => {

    describe('json', () => {

        it('uses the object toJSON', () => {
            class StringWrapper {
                private readonly _content: string;

                constructor(content: string) {
                    this._content = content;
                }

                public toJSON() {
                    return this._content;
                }
            }

            const data = {
                content: new StringWrapper('foo'),
            };

            const res = new ExegesisResponseImpl({} as any);
            res.json(data);
            expect(res.body).to.eql(JSON.stringify({ content: 'foo' }));
        });

    });

});
