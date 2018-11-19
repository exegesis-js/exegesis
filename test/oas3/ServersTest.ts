import { expect } from 'chai';

import Servers from '../../lib/oas3/Servers';

describe('oas3 Servers', () => {

    describe('generateServerParser', () => {

        it('removes server absolute url from path', () => {
            const oas3Server = {
                url: '/api',
            };
            const servers = new Servers([oas3Server]);
            const parser = servers['_servers'][0];
            const result = parser('host', '/api/v1/foo');
            expect(result.pathnameRest).to.eql('/v1/foo');
        });

        it('removes server full url from path', () => {
            const oas3Server = {
                url: 'https://localhost:3030/api',
            };
            const servers = new Servers([oas3Server]);
            const parser = servers['_servers'][0];
            const result = parser('localhost:3030', '/api/v1/foo');
            expect(result.pathnameRest).to.eql('/v1/foo');
        });

    });

});
