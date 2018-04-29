import 'mocha';
import {expect} from 'chai';

import stringToStream from '../../src/utils/stringToStream';

describe("stringToStream", function() {
    it('should convert a string to a stream', function(done) {
        const stream = stringToStream('hello');
        let result = '';

        stream.on('data', chunk => {
            if(typeof chunk === 'string') {
                result += chunk;
            } else {
                result += chunk.toString('utf-8');
            }
        });

        stream.on('end', () => {
            try {
                expect(result).to.equal('hello');
                done();
            } catch(err) {
                done(err);
            }
        });
    });
});