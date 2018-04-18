import * as oas3 from 'openapi3-ts';
import { expect } from 'chai';
import { makeOpenApiDoc, makeContext } from '../../fixtures';
import * as validators from '../../../src/oas3/Schema/validators';
import { ErrorType } from '../../../src/types/common';

const openApiDoc : oas3.OpenAPIObject = Object.assign(
    makeOpenApiDoc(),
    {
        components: {
            schemas: {
                number: {
                    type: 'number'
                },
                object: {
                    type: 'object',
                    required: ['a', 'b'],
                    properties: {
                        a: {
                            type: 'string',
                            readOnly: true
                        },
                        b: {
                            type: 'string',
                            writeOnly: true
                        }
                    }
                },
                object2: {
                    type: 'object',
                    properties: {
                        a: {type: 'number'}
                    }
                }
            }
        }
    }
);

describe('schema validators', function() {
    it('should validate a schema', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/number');

        const validator = validators.generateRequestValidator(context, 'query', 'foo');
        expect(validator(7)).to.eql(null);

        expect(validator("foo")).to.eql([{
            type: ErrorType.Error,
            message: 'should be number',
            location: {
                in: 'query',
                name: 'foo',
                docPath: ['components', 'schemas', 'number'],
                path: []
            }
        }]);
    });

    it('should not require properties marked readOnly in a request', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/object');

        const validator = validators.generateRequestValidator(context, 'body', 'body');
        expect(validator({b: 'hello'}), 'should validate missing "a"').to.eql(null);
        expect(validator({a: 'hello', b: 'hello'}), 'should allow "a"').to.eql(null);

        expect(validator({}), 'should still require "b"').to.eql([{
            type: ErrorType.Error,
            message: "should have required property 'b'",
            location: {
                in: 'body',
                name: 'body',
                docPath: ['components', 'schemas', 'object'],
                path: []
            }
        }]);
    });

    it('should not require properties marked writeOnly in a response', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/object');

        const validator = validators.generateResponseValidator(context, 'body', 'body');
        expect(validator({a: 'hello'}), 'should validate missing "b"').to.eql(null);
        expect(validator({a: 'hello', b: 'hello'}), 'should allow "b"').to.eql(null);

        expect(validator({}), 'should still require "a"').to.eql([{
            type: ErrorType.Error,
            message: "should have required property 'a'",
            location: {
                in: 'body',
                name: 'body',
                docPath: ['components', 'schemas', 'object'],
                path: []
            }
        }]);
    });

    it('should generate a path for the errored element', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/object2');

        const validator = validators.generateRequestValidator(context, 'body', 'body');

        expect(validator({a: 'hello'})).to.eql([{
            type: ErrorType.Error,
            message: 'should be number',
            location: {
                in: 'body',
                name: 'body',
                docPath: ['components', 'schemas', 'object2'],
                path: ['a']
            }
        }]);
    });

});