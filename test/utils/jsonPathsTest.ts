import 'mocha';
import {expect} from 'chai';

import * as jsonPaths from '../../src/utils/jsonPaths';

const PAIRS : [string[], string][] = [
    [['foo', 'bar'], '#/foo/bar'],
    [['foo', 'bar/baz'], '#/foo/bar~1baz'],
    [['foo', 'bar baz'], '#/foo/bar%20baz'],
    [['paths', '/foo/{var}/bar'], '#/paths/~1foo~1%7Bvar%7D~1bar']
];

describe("jsonPaths utils", function() {
    it('should convert a non-uri JSON pointer to a path', function() {
        expect(jsonPaths.jsonPointerToPath('/foo%7Dbar')).to.eql(['foo%7Dbar']);
    });

    it('should handle lower case URI encoded paths', function() {
        expect(jsonPaths.jsonPointerToPath('#/foo/bar%7dbaz'), '').to.eql(['foo', 'bar}baz']);
    });

    it('should handle upper case URI encoded paths', function() {
        expect(jsonPaths.jsonPointerToPath('#/foo/bar%7Dbaz'), '').to.eql(['foo', 'bar}baz']);
    });

    it('should convert back and forth', function() {
        for(const [path, jsonRef] of PAIRS) {
            expect(jsonPaths.pathToJsonPointer(path)).to.eql(jsonRef);
            expect(jsonPaths.jsonPointerToPath(jsonRef)).to.eql(path);
        }
    });
});
