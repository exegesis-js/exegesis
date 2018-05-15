import 'mocha';
import {expect} from 'chai';

import {resolveRef} from '../../src/utils/json-schema-resolve-ref';

describe("resolveRef", function() {
    const doc = {
        a: 7,
        b: {$ref: '#/a'},
        c: {$ref: '#/b'},
        file: {$ref: 'file://a'},
        array: [
            6,
            {$ref: '#/a'}
        ],
        struct: {x: 7},
        struct2: {$ref: '#/struct'},
        struct3: {$ref: '#/struct2/x'}
    };

    it('should resolve a JSON Reference', function() {
        expect(resolveRef(doc, '#/a')).to.equal(7);
    });

    it('should resolve a JSON Reference to an array', function() {
        expect(resolveRef(doc, '#/array/0')).to.equal(6);
    });

    it('should resolve root ref', function() {
        expect(resolveRef(doc, '')).to.eql(doc);
    });

    it('should resolve a JSON Reference to a JSON Reference', function() {
        expect(resolveRef(doc, '#/c')).to.equal(7);
        expect(resolveRef(doc, '#/c')).to.equal(7);
    });

    it('should resolve nested references', function() {
        expect(resolveRef(doc, '#/struct3')).to.equal(7);
    });

    it('should not resolve external references', function() {
        expect(() =>
            resolveRef(doc, '#/file')
        ).to.throw('Cannot resolve non-local ref');
    });

    it('should resolve a ref with /s', function() {
        expect(resolveRef({'a/b': 7}, '#/a~1b')).to.eql(7);
    });

    it('should resolve a ref with URI encoded components', function() {
        expect(resolveRef({'a b': 7}, '#/a%20b')).to.eql(7);
    });
});
