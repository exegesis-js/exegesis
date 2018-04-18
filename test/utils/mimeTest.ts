import 'mocha';
import {expect} from 'chai';

import {MimeTypeRegistry, parseMimeType} from '../../src/utils/mime';

describe("mime utils", function() {
    describe('parseMimeType', function() {
        it('should parse a mime type', function() {
            expect(parseMimeType('application/json')).to.eql({type: 'application', subtype: 'json'});
        });

        it('should always return lower case', function() {
            expect(parseMimeType('APPLICATION/JSON')).to.eql({type: 'application', subtype: 'json'});
        });

        it('should ignore parameters', function() {
            expect(parseMimeType('text/html; foo=bar')).to.eql({type: 'text', subtype: 'html'});
        });
    });

    describe("MimeTypeRegistry", function() {
        it('should register and retrieve mime types', function() {
            const registry = new MimeTypeRegistry<number>();
            registry.set('application/json', 7);
            registry.set('application/xml', 8);
            registry.set('text/plain', 9);

            expect(registry.get('application/json')).to.equal(7);
            expect(registry.get('application/xml')).to.equal(8);
            expect(registry.get('text/plain')).to.equal(9);
            expect(registry.get('text/html')).to.equal(undefined);
            expect(registry.get('image/gif')).to.equal(undefined);
        });

        it('should register and retrieve parsed mime types', function() {
            const registry = new MimeTypeRegistry<number>();
            registry.set({type: 'application', subtype: 'json'}, 7);
            registry.set('application/xml', 8);

            expect(registry.get('application/json')).to.equal(7);
            expect(registry.get({type: 'application', subtype: 'xml'})).to.equal(8);
        });

        it('should allow initialization via a hash of mime types', function() {
            const registry = new MimeTypeRegistry<number>({
                'application/json': 7,
                'application/xml': 8,
                'text/plain': 9
            });

            expect(registry.get('application/json')).to.equal(7);
            expect(registry.get('application/xml')).to.equal(8);
            expect(registry.get('text/plain')).to.equal(9);
            expect(registry.get('text/html')).to.equal(undefined);
            expect(registry.get('image/gif')).to.equal(undefined);
        });

        it('should resolve wildcards', function() {
            const registry = new MimeTypeRegistry<number>();
            registry.set('application/*', 7);
            registry.set('text/*', 9);

            expect(registry.get('application/json')).to.equal(7);
            expect(registry.get('application/xml')).to.equal(7);
            expect(registry.get('text/plain')).to.equal(9);
            expect(registry.get('image/gif')).to.equal(undefined);
        });

        it('should prefer static mimetypes over wildcards', function() {
            const registry = new MimeTypeRegistry<number>();
            registry.set('application/*', 7);
            registry.set('application/xml', 8);

            expect(registry.get('application/json')).to.equal(7);
            expect(registry.get('application/xml')).to.equal(8);
        });

        it('should prefer more specific wildcards over */*', function() {
            const registry = new MimeTypeRegistry<number>();
            registry.set('*/*', 6);
            registry.set('application/*', 7);
            registry.set('image/*', 9);
            registry.set('application/xml', 8);

            expect(registry.get('application/json')).to.equal(7);
            expect(registry.get('application/xml')).to.equal(8);
            expect(registry.get('text/plain')).to.equal(6);
        });

        it('should list registered mime types', function() {
            const registry = new MimeTypeRegistry<number>();
            registry.set('*/*', 6);
            registry.set('application/*', 7);
            registry.set('image/*', 9);
            registry.set('application/xml', 8);
            registry.set('TEXT/PLAIN', 8);

            expect(registry.getRegisteredTypes().sort()).to.eql([
                '*/*',
                'application/*',
                'application/xml',
                'image/*',
                'text/plain'
            ]);
        });

        it('should not be case sentitive', function() {
            const registry = new MimeTypeRegistry<number>();
            registry.set('application/json', 7);
            registry.set('TEXT/PLAIN', 9);
            registry.set('Image/*', 10);

            expect(registry.get('application/json'), 'application/json').to.equal(7);
            expect(registry.get('Application/JSON'), 'Application/JSON').to.equal(7);
            expect(registry.get('text/plain'), 'text/plain').to.equal(9);
            expect(registry.get('image/gif'), 'image/gif').to.equal(10);
            expect(registry.get('IMAGE/GIF'), 'IMAGE/GIF').to.equal(10);
        });

        it('should query mime types with parameters', function() {
            const registry = new MimeTypeRegistry<number>();
            registry.set('application/json', 7);

            expect(registry.get('application/json; foo=bar')).to.equal(7);
            expect(registry.get('application/json;foo=bar')).to.equal(7);
            expect(registry.get('application/json ; foo=bar')).to.equal(7);
            expect(registry.get('application/json; foo=bar; baz=qux')).to.equal(7);
        });

        it('should complain about invalid mime types', function() {
            const registry = new MimeTypeRegistry<number>();

            expect(
                () => registry.set('application/json/foo', 7)
            ).to.throw('Invalid MIME type: "application/json/foo"');

            expect(
                () => registry.set('application', 7)
            ).to.throw('Invalid MIME type: "application"');

        });
    });
});