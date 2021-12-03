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

            const res = new ExegesisResponseImpl({ socket: {} } as any, true);
            res.json(data);

            expect(res.headers['content-type']).to.equal('application/json');
            expect(res.body).to.eql(JSON.stringify({ content: 'foo' }));
        });

        it('skips toJSON if response validation is disabled', () => {
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

            const res = new ExegesisResponseImpl({ socket: {} } as any, false);
            res.json(data);

            expect(res.headers['content-type']).to.equal('application/json');
            expect(res.body).to.eql(data);
        });
    });

    describe('pureJson', () => {
        it('set the response body', () => {
            const body = { content: 'foo' };

            const res = new ExegesisResponseImpl({ socket: {} } as any, true);
            res.pureJson(body);

            expect(res.headers['content-type']).to.equal('application/json');
            expect(res.body).to.eql(body);
        });
    });
});
