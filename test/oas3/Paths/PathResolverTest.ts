import 'mocha';
import {expect} from 'chai';

import PathResolver from '../../../src/oas3/Paths/PathResolver';

describe("oas3 PathResolver", function() {
    it('empty path resolver should not resolve anything', function() {
        const resolver = new PathResolver<string>();
        expect(resolver.resolvePath('/foo/bar')).to.equal(undefined);
    });

    it('should resolve concrete paths', function() {
        const resolver = new PathResolver<string>();
        resolver.registerPath('/foo/bar', 'hello');
        resolver.registerPath('/foo/baz', 'world');

        expect(resolver.resolvePath('/foo/bar'), '/foo/bar').to.eql({value: 'hello', rawPathParams: undefined});
        expect(resolver.resolvePath('/foo/baz'), '/foo/baz').to.eql({value: 'world', rawPathParams: undefined});
        expect(resolver.resolvePath('/foo/qux'), '/foo/qux').to.equal(undefined);
    });

    it('should resolve templated paths, and parse raw parameter values', function() {
        const resolver = new PathResolver<string>();
        resolver.registerPath('/a/b/{var}', 'hello');
        resolver.registerPath('/c/{otherVar}/d', 'world');

        expect(resolver.resolvePath('/a/b/value')).to.eql({value: 'hello', rawPathParams: {var: 'value'}});
        expect(resolver.resolvePath('/a/b/')).to.eql({value: 'hello', rawPathParams: {var: ''}});
        expect(resolver.resolvePath('/a/b')).to.equal(undefined);

        expect(resolver.resolvePath('/c/test/d')).to.eql({value: 'world', rawPathParams: {otherVar: 'test'}});
        expect(resolver.resolvePath('/c//d')).to.eql({value: 'world', rawPathParams: {otherVar: ''}});
        expect(resolver.resolvePath('/c/d')).to.equal(undefined);

        expect(resolver.resolvePath('/foo/qux')).to.equal(undefined);
    });

    it('should resolve templated paths with multiple parameters', function() {
        const resolver = new PathResolver<string>();
        resolver.registerPath('/{a}/{b}/{c}', 'hello');
        expect(resolver.resolvePath('/1/2/3')).to.eql({value: 'hello', rawPathParams: {a: '1', b: '2', c: '3'}});
    });

    it('should resolve paths with unusual templating', function() {
        const resolver = new PathResolver<string>();
        resolver.registerPath('/{a}x{b}x{c}', 'hello');
        resolver.registerPath('/foo/{a}{b}{c}', 'hello');
        expect(resolver.resolvePath('/1x2x3')).to.eql({value: 'hello', rawPathParams: {a: '1', b: '2', c: '3'}});
        expect(resolver.resolvePath('/1x2x3x4')).to.eql({value: 'hello', rawPathParams: {a: '1x2', b: '3', c: '4'}});
        expect(resolver.resolvePath('/foo/123')).to.eql({value: 'hello', rawPathParams: {a: '123', b: '', c: ''}});
    });

    it('should resolve concrete paths before paths with templates', function() {
        const resolver = new PathResolver<string>();
        resolver.registerPath('/a/b/{var}', 'hello');
        resolver.registerPath('/a/b/c', 'world');

        expect(resolver.resolvePath('/a/b/value')).to.eql({value: 'hello', rawPathParams: {var: 'value'}});
        expect(resolver.resolvePath('/a/b/c')).to.eql({value: 'world', rawPathParams: undefined});

        // Same results even if paths are registered in the opposite order.
        const resolver2 = new PathResolver<string>();
        resolver2.registerPath('/a/b/c', 'world');
        resolver2.registerPath('/a/b/{var}', 'hello');

        expect(resolver2.resolvePath('/a/b/value')).to.eql({value: 'hello', rawPathParams: {var: 'value'}});
        expect(resolver2.resolvePath('/a/b/c')).to.eql({value: 'world', rawPathParams: undefined});

    });

});
