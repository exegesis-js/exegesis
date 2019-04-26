import * as oas3 from 'openapi3-ts';
import { expect } from 'chai';
import { makeOpenApiDoc, makeContext } from '../../fixtures';
import * as validators from '../../../src/oas3/Schema/validators';

import { ParameterLocation } from '../../../src/types';

const openApiDoc: oas3.OpenAPIObject = Object.assign(makeOpenApiDoc(), {
    components: {
        schemas: {
            number: {
                type: 'number',
            },
            float: {
                type: 'number',
                format: 'float',
            },
            int32: {
                type: 'integer',
                format: 'int32',
            },
            object: {
                type: 'object',
                required: ['a', 'b'],
                properties: {
                    a: {
                        type: 'string',
                        readOnly: true,
                    },
                    b: {
                        type: 'string',
                        writeOnly: true,
                    },
                },
            },
            object2: {
                type: 'object',
                properties: {
                    a: { type: 'number' },
                },
            },
            object3: {
                type: 'object',
                required: ['a', 'b'],
                properties: {
                    a: {
                        type: 'string',
                    },
                    b: {
                        type: 'string',
                    },
                },
            },
            noAdditional: {
                type: 'object',
                properties: {
                    a: { type: 'number' },
                },
                additionalProperties: false,
            },
            aNullableObject: {
                type: 'object',
                required: ['a'],
                nullable: true,
                properties: {
                    a: {
                        type: 'string',
                    },
                },
            },
            withDefault: {
                type: 'object',
                properties: {
                    a: { type: 'number', default: 6 },
                },
            },
            numberWithDefault: {
                type: 'number',
                default: 7,
            },
            numberOrString: {
                oneOf: [{ type: 'number' }, { type: 'string' }],
            },
        },
    },
});

const REQUEST_BODY_LOCATION: ParameterLocation = {
    in: 'request',
    name: 'body',
    docPath: 'paths/~1foo/post/requestBody/content/application~1/json',
};

const QUERY_PARAM_LOCATION: ParameterLocation = {
    in: 'query',
    name: 'foo',
    docPath: '/components/parameters/foo',
};

describe('schema validators', function() {
    it('should validate a schema', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/number');

        const validator = validators.generateRequestValidator(
            context,
            QUERY_PARAM_LOCATION,
            false,
            'application/x-www-form-urlencoded'
        );
        expect(validator(7)).to.eql({ errors: null, value: 7 });

        expect(validator('foo').errors).to.eql([
            {
                message: 'should be number',
                location: {
                    in: 'query',
                    name: 'foo',
                    docPath: '/components/schemas/number',
                    path: '',
                },
                ajvError: {
                    dataPath: '/value',
                    keyword: 'type',
                    message: 'should be number',
                    params: {
                        type: 'number',
                    },
                    schemaPath: '#/properties/value/type',
                },
            },
        ]);
    });

    it('should not require properties marked readOnly in a request', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/object');

        const validator = validators.generateRequestValidator(
            context,
            REQUEST_BODY_LOCATION,
            false,
            'application/x-www-form-urlencoded'
        );
        expect(validator({ b: 'hello' }).errors, 'should validate missing "a"').to.eql(null);
        expect(validator({ a: 'hello', b: 'hello' }).errors, 'should allow "a"').to.eql(null);

        expect(validator({}).errors, 'should still require "b"').to.eql([
            {
                message: "should have required property 'b'",
                location: {
                    in: 'request',
                    name: 'body',
                    docPath: '/components/schemas/object',
                    path: '',
                },
                ajvError: {
                    dataPath: '/value',
                    keyword: 'required',
                    message: "should have required property 'b'",
                    params: {
                        missingProperty: 'b',
                    },
                    schemaPath: '#/properties/value/required',
                },
            },
        ]);
    });

    it('should not require properties marked writeOnly in a response', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/object');

        const validator = validators.generateResponseValidator(
            context,
            REQUEST_BODY_LOCATION,
            false
        );
        expect(validator({ a: 'hello' }).errors, 'should validate missing "b"').to.eql(null);
        expect(validator({ a: 'hello', b: 'hello' }).errors, 'should allow "b"').to.eql(null);

        expect(validator({}).errors, 'should still require "a"').to.eql([
            {
                message: "should have required property 'a'",
                location: {
                    in: 'request',
                    name: 'body',
                    docPath: '/components/schemas/object',
                    path: '',
                },
                ajvError: {
                    dataPath: '/value',
                    keyword: 'required',
                    message: "should have required property 'a'",
                    params: {
                        missingProperty: 'a',
                    },
                    schemaPath: '#/properties/value/required',
                },
            },
        ]);
    });

    it('should strip additional properties', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/noAdditional', {});

        const validator = validators.generateRequestValidator(
            context,
            REQUEST_BODY_LOCATION,
            false,
            'application/x-www-form-urlencoded'
        );
        const { errors, value } = validator({ a: 7, b: 'foo' });
        expect(errors).to.equal(null);
        expect(value).to.eql({ a: 7 });
    });

    it('should generate a path for the errored element', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/object2');

        const validator = validators.generateRequestValidator(
            context,
            REQUEST_BODY_LOCATION,
            false,
            'application/x-www-form-urlencoded'
        );

        expect(validator({ a: 'hello' }).errors).to.eql([
            {
                message: 'should be number',
                location: {
                    in: 'request',
                    name: 'body',
                    docPath: '/components/schemas/object2',
                    path: '/a',
                },
                ajvError: {
                    dataPath: '/value/a',
                    keyword: 'type',
                    message: 'should be number',
                    params: {
                        type: 'number',
                    },
                    schemaPath: '#/properties/value/properties/a/type',
                },
            },
        ]);
    });

    it('should validate an integer with a format', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/int32');

        const validator = validators.generateRequestValidator(
            context,
            QUERY_PARAM_LOCATION,
            false,
            'application/x-www-form-urlencoded'
        );
        expect(validator(7).errors).to.eql(null);

        expect(validator(Math.pow(2, 32)).errors).to.eql([
            {
                message: 'should match format "int32"',
                location: {
                    in: 'query',
                    name: 'foo',
                    docPath: '/components/schemas/int32',
                    path: '',
                },
                ajvError: {
                    dataPath: '/value',
                    keyword: 'format',
                    message: 'should match format "int32"',
                    params: {
                        format: 'int32',
                    },
                    schemaPath: '#/properties/value/format',
                },
            },
        ]);
    });

    it('should validate a float', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/float');

        const validator = validators.generateRequestValidator(
            context,
            QUERY_PARAM_LOCATION,
            false,
            'application/x-www-form-urlencoded'
        );
        expect(validator(7.5).errors).to.eql(null);
    });

    it('should error for a missing value if required', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/int32');

        const validator = validators.generateRequestValidator(
            context,
            QUERY_PARAM_LOCATION,
            true,
            'application/x-www-form-urlencoded'
        );

        expect(validator(7).errors).to.eql(null);
        expect(validator(undefined).errors).to.eql([
            {
                message: 'Missing required query parameter "foo"',
                location: {
                    in: 'query',
                    name: 'foo',
                    docPath: '/components/parameters/foo',
                    path: '',
                },
            },
        ]);
    });

    it('should not error for a missing value if not required', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/int32');

        const validator = validators.generateRequestValidator(
            context,
            QUERY_PARAM_LOCATION,
            false,
            'application/x-www-form-urlencoded'
        );

        expect(validator(7).errors).to.eql(null);
        expect(validator(undefined).errors).to.eql(null);
    });

    it('should not error for a missing object if nullable', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/aNullableObject');

        const validator = validators.generateRequestValidator(
            context,
            QUERY_PARAM_LOCATION,
            false,
            'application/json'
        );

        expect(validator(null).errors).to.eql(null);
        expect(validator(undefined).errors).to.eql(null);
    });

    it('should fill in default values', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/withDefault');

        const validator = validators.generateRequestValidator(
            context,
            REQUEST_BODY_LOCATION,
            false,
            'application/json'
        );

        const obj: any = {};
        expect(validator(obj).errors).to.eql(null);
        expect(obj.a).to.equal(6);
    });

    it('only return the first error if options.allErrors is false', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/object3');

        const validator = validators.generateRequestValidator(
            context,
            REQUEST_BODY_LOCATION,
            false,
            'application/json'
        );

        const obj: any = {};
        expect(validator(obj)).to.eql({
            errors: [
                {
                    ajvError: {
                        dataPath: '/value',
                        keyword: 'required',
                        message: "should have required property 'a'",
                        params: {
                            missingProperty: 'a',
                        },
                        schemaPath: '#/properties/value/required',
                    },
                    location: {
                        docPath: '/components/schemas/object3',
                        in: 'request',
                        name: 'body',
                        path: '',
                    },
                    message: "should have required property 'a'",
                },
            ],
            value: {},
        });
    });

    it('return multiple errors if options.allErrors is true', function() {
        const context = makeContext(openApiDoc, '#/components/schemas/object3', {
            allErrors: true,
        });

        const validator = validators.generateRequestValidator(
            context,
            REQUEST_BODY_LOCATION,
            false,
            'application/json'
        );

        const obj: any = {};
        expect(validator(obj)).to.eql({
            errors: [
                {
                    ajvError: {
                        dataPath: '/value',
                        keyword: 'required',
                        message: "should have required property 'a'",
                        params: {
                            missingProperty: 'a',
                        },
                        schemaPath: '#/properties/value/required',
                    },
                    location: {
                        docPath: '/components/schemas/object3',
                        in: 'request',
                        name: 'body',
                        path: '',
                    },
                    message: "should have required property 'a'",
                },
                {
                    ajvError: {
                        dataPath: '/value',
                        keyword: 'required',
                        message: "should have required property 'b'",
                        params: {
                            missingProperty: 'b',
                        },
                        schemaPath: '#/properties/value/required',
                    },
                    location: {
                        docPath: '/components/schemas/object3',
                        in: 'request',
                        name: 'body',
                        path: '',
                    },
                    message: "should have required property 'b'",
                },
            ],
            value: {},
        });
    });

    describe('type coercion', function() {
        it('type coerce root values', function() {
            const context = makeContext(openApiDoc, '#/components/schemas/numberWithDefault');

            const validator = validators.generateRequestValidator(
                context,
                REQUEST_BODY_LOCATION,
                false,
                'application/x-www-form-urlencoded'
            );

            const obj: any = '9';
            expect(validator(obj)).to.eql({
                errors: null,
                value: 9,
            });

            expect(validator(undefined)).to.eql({
                errors: null,
                value: 7,
            });
        });

        it('not type coerce request values for application/json', function() {
            const context = makeContext(openApiDoc, '#/components/schemas/numberWithDefault');

            const validator = validators.generateRequestValidator(
                context,
                REQUEST_BODY_LOCATION,
                false,
                'application/json'
            );

            const obj: any = '9';
            expect(validator(obj)).to.eql({
                errors: [
                    {
                        ajvError: {
                            dataPath: '/value',
                            keyword: 'type',
                            message: 'should be number',
                            params: {
                                type: 'number',
                            },
                            schemaPath: '#/properties/value/type',
                        },
                        location: {
                            docPath: '/components/schemas/numberWithDefault',
                            in: 'request',
                            name: 'body',
                            path: '',
                        },
                        message: 'should be number',
                    },
                ],
                value: "9",
            });

            expect(validator(undefined)).to.eql({
                errors: null,
                value: 7,
            });
        });

        it('not type coerce values for a response', function() {
            const context = makeContext(openApiDoc, '#/components/schemas/numberOrString');

            const validator = validators.generateResponseValidator(
                context,
                REQUEST_BODY_LOCATION,
                false
            );

            expect(validator('9')).to.eql({
                errors: null,
                value: '9',
            });

            expect(validator(9)).to.eql({
                errors: null,
                value: 9,
            });
        });
    });
});
