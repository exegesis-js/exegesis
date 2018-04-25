import 'mocha';
import { expect } from 'chai';
import { ParameterLocation } from '../../../src/types';
import * as parameterParsers from '../../../src/oas3/parameterParsers';

describe('oas3 parameter parsers', function() {
    const queryParameterLocation : ParameterLocation = {
        in: 'query',
        name: 'myParam',
        docPath: ['paths', '/foo', 'parameters', '0']
    };

    it('should generate a pipe-delimited parser', function() {
        const parser = parameterParsers.generateParser({
            style: 'pipeDelimited',
            explode: false,
            schema: {type: 'array'}
        });

        const result = parameterParsers.parseQueryParameters(
            [{location: queryParameterLocation, parser}],
            "myParam=foo%7Cbar"
        );

        expect(result).to.eql({myParam: ['foo', 'bar']});
    });

});