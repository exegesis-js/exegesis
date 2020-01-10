import { expect } from 'chai';

import Servers from '../../src/oas3/Servers';

describe('oas3 Servers', () => {
    describe('generateServerParser', () => {
        it('removes server absolute url from path', () => {
            const oas3Server = {
                url: '/api',
            };
            const servers = new Servers([oas3Server]);
            const parser = servers['_servers'][0];
            const result = parser('host', '/api/v1/foo')!;
            expect(result.pathnameRest).to.eql('/v1/foo');
            expect(result.baseUrl).to.eql('/api');
        });

        it('removes server full url from path', () => {
            const oas3Server = {
                url: 'https://localhost:3030/api',
            };
            const servers = new Servers([oas3Server]);
            const parser = servers['_servers'][0];
            const result = parser('localhost:3030', '/api/v1/foo')!;
            expect(result.pathnameRest).to.eql('/v1/foo');
            expect(result.baseUrl).to.eql('/api');
        });

        it('works with no path in absolute url', () => {
            const oas3Server = {
                url: '/',
            };
            const servers = new Servers([oas3Server]);
            const parser = servers['_servers'][0];
            const result = parser('host', '/v1/foo')!;
            expect(result.pathnameRest).to.eql('/v1/foo');
            expect(result.baseUrl).to.eql('');
        });

        it('works with no path in absolute url (and no trailing /)', () => {
            const oas3Server = {
                url: '',
            };
            const servers = new Servers([oas3Server]);
            const parser = servers['_servers'][0];
            const result = parser('host', '/v1/foo')!;
            expect(result.pathnameRest).to.eql('/v1/foo');
            expect(result.baseUrl).to.eql('');
        });

        it('works with no path in full url', () => {
            const oas3Server = {
                url: 'https://localhost:3030/',
            };
            const servers = new Servers([oas3Server]);
            const parser = servers['_servers'][0];
            const result = parser('localhost:3030', '/v1/foo')!;
            expect(result.pathnameRest).to.eql('/v1/foo');
            expect(result.baseUrl).to.eql('');
        });

        it('works with no path in full url (and no trailing /)', () => {
            const oas3Server = {
                url: 'https://localhost:3030',
            };
            const servers = new Servers([oas3Server]);
            const parser = servers['_servers'][0];
            const result = parser('localhost:3030', '/v1/foo')!;
            expect(result.pathnameRest).to.eql('/v1/foo');
            expect(result.baseUrl).to.eql('');
        });
    });
});
