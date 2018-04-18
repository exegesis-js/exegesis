import 'mocha';
import {expect} from 'chai';

import * as jsonPaths from '../../src/utils/jsonPaths';

const PAIRS : [string[], string][] = [
    [['foo', 'bar'], '/foo/bar'],
    [['foo', 'bar/baz'], '/foo/bar~1baz'],
    [['foo', 'bar baz'], '/foo/bar baz'],
    [['paths', '/foo/{var}/bar'], '/paths/~1foo~1{var}~1bar']
];

describe("jsonPaths utils", function() {
    for(const [path, jsonRef] of PAIRS) {
        it(`should convert path ${JSON.stringify(path)} to pointer ${jsonRef} and back`, function() {
            expect(jsonPaths.pathToJsonPointer(path)).to.eql(jsonRef);
            expect(jsonPaths.jsonPointerToPath(jsonRef)).to.eql(path);
        });
    }

    it('should convert a non-uri JSON pointer to a path', function() {
        expect(jsonPaths.jsonPointerToPath('/foo%7Dbar')).to.eql(['foo%7Dbar']);
    });

    it('should handle lower case URI encoded pointers', function() {
        expect(jsonPaths.jsonPointerToPath('#/foo/bar%7dbaz'), '').to.eql(['foo', 'bar}baz']);
    });

    it('should handle upper case URI encoded pointers', function() {
        expect(jsonPaths.jsonPointerToPath('#/foo/bar%7Dbaz'), '').to.eql(['foo', 'bar}baz']);
    });

    it('should convert URI fragment pointers to regular pointers', function() {
        expect(jsonPaths.jsonPointerUriFragmentToJsonPointer('#/foo/bar%7Dbaz')).to.equal('/foo/bar}baz');
    });

    it('should convert regular pointers to URI fragment pointers', function() {
        expect(jsonPaths.jsonPointerToJsonPointerUriFragment('/foo/bar}baz')).to.equal('#/foo/bar%7Dbaz');
    });
});
