import 'mocha';
import {expect} from 'chai';

import inferTypes from '../../src/utils/json-schema-infer-types';
import { JSONSchema4 } from 'json-schema';

describe("json-schema-infer-types", function() {
    it("should get the type from a simple object", function() {
        expect(inferTypes({type: 'object'})).to.eql(['object']);
        expect(inferTypes({type: 'integer'})).to.eql(['integer']);
    });

    it("number includes integer", function() {
        expect(new Set(inferTypes({type: 'number'}))).to.have.all.keys(['number', 'integer']);
    });

    it("should get the type from a schema with multiple types", function() {
        const schema : JSONSchema4 = {
            type: ['object', 'integer']
        };

        expect(new Set(inferTypes(schema))).to.have.all.keys(['object', 'integer']);
    });

    it("should not infer anything from minProperties", function() {
        // Since minProperties only applies if the value being validated is an
        // object, then the presence of a 'minProperties' key doesn't imply
        // the the value has to be an object.
        const schema = {
            minProperties: 1
        };

        expect(new Set(inferTypes(schema))).to.have.all.keys([
            'null', 'boolean', 'object', 'array', 'number', 'string', 'integer'
        ]);
    });

    it("should get the type from a schema with oneOf", function() {
        const schema : JSONSchema4 = {
            oneOf: [
                {type: 'object'},
                {type: 'integer'}
            ]
        };

        expect(new Set(inferTypes(schema))).to.have.all.keys(['object', 'integer']);
    });

    it("should get the type from a schema with anyOf", function() {
        const schema : JSONSchema4 = {
            anyOf: [
                {type: 'object'},
                {type: 'integer'}
            ]
        };

        expect(new Set(inferTypes(schema))).to.have.all.keys(['object', 'integer']);
    });

    it("should get the type from a schema with anyOf and oneOf", function() {
        const schema : JSONSchema4 = {
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
        const schema : JSONSchema4 = {
            allOf: [
                {type: 'object'},
                {type: 'object'}
            ]
        };

        expect(inferTypes(schema)).to.eql(['object']);
    });

    it("should get the type from an object with enum", function() {
        const schema : JSONSchema4 = {
            enum: ['foo', 'bar', 7]
        };

        expect(new Set(inferTypes(schema))).to.have.all.keys(['string', 'integer']);
    });

    it("should get the type from an object with const", function() {
        expect(inferTypes({const: 'foo'})).to.eql(['string']);
        expect(inferTypes({const: {foo: 'bar'}})).to.eql(['object']);
        expect(inferTypes({const: ['foo']})).to.eql(['array']);
        expect(inferTypes({const: 7})).to.eql(['integer']);
        expect(inferTypes({const: 7.2})).to.eql(['number', 'integer']);
        expect(inferTypes({const: null})).to.eql(['null']);
        expect(inferTypes({const: true})).to.eql(['boolean']);
        expect(inferTypes({const: false})).to.eql(['boolean']);
    });

    it("should follow $refs", function() {
        const schema : JSONSchema4 = {
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
        const schema : JSONSchema4 = {
            allOf: [
                {type: 'object'},
                {type: 'integer'}
            ]
        };

        expect(inferTypes(schema)).to.eql([]);
    });

    it("should handle crazy complicated cases", function() {
        const schema : JSONSchema4 = {
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

        expect(new Set(inferTypes(schema))).to.have.all.keys(['object', 'integer']);
    });
});
