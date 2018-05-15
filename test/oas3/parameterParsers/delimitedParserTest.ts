import 'mocha';
import {expect} from 'chai';

import { pipeDelimitedParser, spaceDelimitedParser } from '../../../src/oas3/parameterParsers/delimitedParser';
import { ParameterLocation } from '../../../src/types';

describe('oas3 parameter parsers - delimited parser', function() {
    const parameterLocation : ParameterLocation = {
        in: 'query',
        name: 'myParam',
        docPath: '/paths/~1foo/parameters/0'
    };

    it('should correctly parse a pipe delimited string', function() {
        const result = pipeDelimitedParser(parameterLocation, {myParam: 'foo%7Cbar'});
        expect(result).to.eql(['foo', 'bar']);
    });

    it('should correctly parse a space delimited string', function() {
        const result = spaceDelimitedParser(parameterLocation, {myParam: 'foo%20bar'});
        expect(result).to.eql(['foo', 'bar']);
    });

    it('decode pct-encoded characters', function() {
        const result = pipeDelimitedParser(parameterLocation, {myParam: 'foo%7Cbar%2Cbaz'});
        expect(result).to.eql(['foo', 'bar,baz']);
    });

    it('should correctly parse a pipe delimited string with one value', function() {
        const result = pipeDelimitedParser(parameterLocation, {myParam: 'foo'});
        expect(result).to.eql(['foo']);
    });

    it('should do something sensible for a pipe delimited parameter which shows up more than once', function() {
        const result = pipeDelimitedParser(parameterLocation, {myParam: ['foo', 'bar%7Cbaz']});
        expect(result).to.eql(['foo', 'bar|baz']);
    });

});