import 'mocha';
import { expect } from 'chai';
import * as jsonPaths from '../../src/utils/jsonPaths';

describe('jsonPaths utils', function() {
    it('should find prefix', function() {
        expect(jsonPaths.jsonPointerStartsWith('/foo/bar', '/foo')).to.equal(true);
        expect(jsonPaths.jsonPointerStartsWith('/foo/bar', '/baz')).to.equal(false);
    });

    it('should find prefix, even if prefix is a URI fragment', function() {
        expect(jsonPaths.jsonPointerStartsWith('/foo/bar', '#/foo')).to.equal(true);
        expect(jsonPaths.jsonPointerStartsWith('/foo/bar', '#/baz')).to.equal(false);
    });

    it('should strip prefix', function() {
        expect(jsonPaths.jsonPointerStripPrefix('/foo/bar', '/foo')).to.equal('/bar');
    });

    it('should strip prefix. but preserve URI fragment format', function() {
        expect(jsonPaths.jsonPointerStripPrefix('#/foo/bar', '/foo')).to.equal('#/bar');
    });

    it('should convert a JSON pointer in string representation to URI fragment representation', function() {
        expect(jsonPaths.toUriFragment('/foo/bar')).to.equal('#/foo/bar');
    });

    it('should convert a JSON pointer in URI fragment representation to URI fragment representation', function() {
        expect(jsonPaths.toUriFragment('#/foo/bar')).to.equal('#/foo/bar');
    });
});
