import 'mocha';
import {expect} from 'chai';

import inferTypes from '../../src/utils/json-schema-infer-types';

describe("json-schema-infer-types", function() {
    it("should get the type from a simple object", function() {
        expect(inferTypes({type: 'object'})).to.eql(['object']);
        expect(inferTypes({type: 'integer'})).to.eql(['integer']);
    });

    it("number includes integer", function() {
        expect(inferTypes({type: 'number'})).to.eql(['number', 'integer']);
    });

    it("should get the type from a schema with multiple types", function() {
        const schema = {
            type: ['object', 'integer']
        };

        expect(inferTypes(schema)).to.eql(['object', 'integer']);
    });

    it("should infer that a schema with properties must be an object", function() {
        const schema = {
            required: ['name'],
            properties: {
                name: {type: 'string'}
            }
        };

        expect(inferTypes(schema)).to.eql(['object']);
    });

    it("should infer that a schema with numeric properties must be an object or an array", function() {
        const schema = {
            required: ['0'],
            properties: {
                '0': {type: 'string'}
            }
        };

        expect(inferTypes(schema)).to.eql(['object', 'array']);
    });

    it("should infer that a schema with minProperties must describe an array or an object", function() {
        const schema = {
            minProperties: 1
        };

        expect(inferTypes(schema)).to.eql(['object', 'array']);
    });

    it("should get the type from a schema with oneOf", function() {
        const schema = {
            oneOf: [
                {type: 'object'},
                {type: 'integer'}
            ]
        };

        expect(inferTypes(schema)).to.eql(['object', 'integer']);
    });

    it("should get the type from a schema with anyOf", function() {
        const schema = {
            anyOf: [
                {type: 'object'},
                {type: 'integer'}
            ]
        };

        expect(inferTypes(schema)).to.eql(['object', 'integer']);
    });

    it("should get the type from a schema with anyOf and oneOf", function() {
        const schema = {
            anyOf: [
                {type: 'object'},
                {type: 'integer'}
            ],
            oneOf: [
                {type: 'object'},
                {type: 'array'}
            ]
        };

        expect(inferTypes(schema)).to.eql(['object']);
    });

    it("should get the type from an object with allOf", function() {
        const schema = {
            allOf: [
                {type: 'object'},
                {type: 'object'}
            ]
        };

        expect(inferTypes(schema)).to.eql(['object']);
    });

    it("should follow $refs", function() {
        const schema = {
            allOf: [
                {$ref: '#/definitions/a'},
                {$ref: '#/definitions/b'}
            ],
            definitions: {
                a: {type: 'object'},
                b: {type: 'object'}
            }
        };

        expect(inferTypes(schema)).to.eql(['object']);
    });

    it("should get the type from an impossible object", function() {
        const schema = {
            allOf: [
                {type: 'object'},
                {type: 'integer'}
            ]
        };

        expect(inferTypes(schema)).to.eql([]);
    });

    it("should handle crazy complicated cases", function() {
        const schema = {
            allOf: [
                {type: ['object', 'integer']},
                {type: ['object', 'number', 'integer']}
            ],
            oneOf: [
                {type: 'integer'},
                {type: 'array'},
                {type: ['null', 'object']}
            ],
            type: ['object', 'integer']
        };

        expect(inferTypes(schema)).to.eql(['object', 'integer']);
    });
});

