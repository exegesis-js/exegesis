import 'mocha';
import {expect} from 'chai';

import * as jsonPaths from '../../src/utils/jsonPaths';

const PAIRS : [string[], string][] = [
    [['paths', '/foo/{var}/bar'], '#/paths/%2Ffoo%2F%7Bvar%7D%2Fbar']
];

describe("jsonPaths utils", function() {
    it('should convert a path to a JsonRef', function() {
        expect(jsonPaths.pathToJsonRef(['foo', 'bar'])).to.equal('#/foo/bar');
        expect(jsonPaths.pathToJsonRef(['foo', 'bar/baz'])).to.equal('#/foo/bar%2Fbaz');
    });

    it('should convert a JsonRef to a path', function() {
        expect(jsonPaths.jsonRefToPath('#/foo/bar'), '#/foo/bar').to.eql(['foo', 'bar']);

        expect(jsonPaths.jsonRefToPath('/foo/bar'), 'Should accept paths that start with /')
            .to.eql(['foo', 'bar']);


        expect(jsonPaths.jsonRefToPath('/foo/bar%2Fbaz'), 'Should handle URI encoded paths')
            .to.eql(['foo', 'bar/baz']);

        expect(jsonPaths.jsonRefToPath('/foo/bar%2fbaz'), 'Should handle lower case URI encoded paths')
            .to.eql(['foo', 'bar/baz']);
    });

    it('should convert back and forth', function() {
        for(const [path, jsonRef] of PAIRS) {
            expect(jsonPaths.pathToJsonRef(path)).to.eql(jsonRef);
            expect(jsonPaths.jsonRefToPath(jsonRef)).to.eql(path);
        }
    });
});
