import 'mocha';
import { expect } from 'chai';
import { ParameterLocation } from '../../../src/types';
import * as parameterParsers from '../../../src/oas3/parameterParsers';

describe('oas3 parameter parsers', function() {
    const queryParameterLocation : ParameterLocation = {
        in: 'query',
        name: 'myParam',
        docPath: '/paths/~1foo/parameters/0'
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

    it('should fill in default value if not provided', function() {
        const parser = parameterParsers.generateParser({
            style: 'simple',
            explode: false,
            schema: {
                type: 'number',
                default: 6
            }
        });

        const specified = parameterParsers.parseQueryParameters(
            [{location: queryParameterLocation, parser}],
            "myParam=9"
        );
        expect(specified, 'specified').to.eql({myParam: '9'});

        const unspecified = parameterParsers.parseQueryParameters(
            [{location: queryParameterLocation, parser}],
            ""
        );
        expect(unspecified, 'unspecified').to.eql({myParam: 6});
    });

    it('should fill in falsey default value if not provided', function() {
        const parser = parameterParsers.generateParser({
            style: 'simple',
            explode: false,
            schema: {
                type: 'number',
                default: 0
            }
        });

        const unspecified = parameterParsers.parseQueryParameters(
            [{location: queryParameterLocation, parser}],
            ""
        );
        expect(unspecified).to.eql({myParam: 0});
    });
});