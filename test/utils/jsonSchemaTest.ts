import 'mocha';
import { expect } from 'chai';

import * as jsonSchema from '../../src/utils/jsonSchema';

describe('jsonSchema utils', function () {
    describe('extractSchema', function () {
        it('should extract a schema from a parent document and resolve refs', function () {
            const doc = {
                myDoc: {
                    someStuff: {
                        schema: {
                            type: 'object',
                            properties: {
                                users: { type: 'array', items: { $ref: '#/defs/User' } },
                                menu: { $ref: '#/defs/Menu' },
                            },
                        },
                    },
                },
                defs: {
                    name: { type: 'string' },
                    User: {
                        type: 'object',
                        properties: {
                            name: { $ref: '#/defs/name' },
                        },
                    },
                    Menu: {
                        type: 'object',
                        properties: {
                            items: { type: 'array', items: { $ref: '#/defs/MenuItem' } },
                        },
                    },
                    MenuItem: {
                        oneOf: [
                            // Circular ref
                            { $ref: '#/defs/Menu' },
                            { type: 'string' },
                        ],
                    },
                },
            };

            const result = jsonSchema.extractSchema(doc, '#/myDoc/someStuff/schema');
            expect(result).to.eql({
                type: 'object',
                properties: {
                    users: { type: 'array', items: { $ref: '#/definitions/User' } },
                    menu: {
                        $ref: '#/definitions/Menu',
                    },
                },
                definitions: {
                    name: { type: 'string' },
                    User: {
                        type: 'object',
                        properties: {
                            name: { $ref: '#/definitions/name' },
                        },
                    },
                    Menu: {
                        type: 'object',
                        properties: {
                            items: { type: 'array', items: { $ref: '#/definitions/MenuItem' } },
                        },
                    },
                    MenuItem: {
                        oneOf: [
                            // Circular ref
                            { $ref: '#/definitions/Menu' },
                            { type: 'string' },
                        ],
                    },
                },
            });
        });

        it('should extract a schema when one scheme is a prefix of the other', function () {
            const doc = {
                components: {
                    schemas: {
                        A: {
                            description: 'thing',
                            oneOf: [
                                {
                                    $ref: '#/components/schemas/AA',
                                },
                            ],
                        },
                        AA: {
                            type: 'object',
                        },
                    },
                },
            };

            const result = jsonSchema.extractSchema(doc, '#/components/schemas/A');
            expect(result).to.eql({
                description: 'thing',
                oneOf: [
                    {
                        $ref: '#/definitions/AA',
                    },
                ],
                definitions: {
                    AA: { type: 'object' },
                },
            });
        });

        it('should correctly handle nested refs (#134)', function () {
            const doc = {
                paths: {
                    '/test': {
                        get: {
                            responses: {
                                '200': {
                                    description: 'test.',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    test: {
                                                        $ref:
                                                            '#/definitions/LinkObject/properties/test/allOf/0',
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                definitions: {
                    LinkObject: {
                        type: 'object',
                        properties: {
                            test: {
                                allOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            next: {
                                                anyOf: [
                                                    {
                                                        $ref:
                                                            '#/definitions/LinkObject/properties/test/allOf/0/additionalProperties/anyOf/0',
                                                    },
                                                    {
                                                        $ref:
                                                            '#/definitions/LinkObject/properties/test/allOf/0/additionalProperties/anyOf/1',
                                                    },
                                                ],
                                            },
                                        },
                                        additionalProperties: {
                                            anyOf: [
                                                {
                                                    type: 'array',
                                                    items: { type: 'object' },
                                                },
                                                { type: 'object' },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            };
            const result = jsonSchema.extractSchema(
                doc,
                '/paths/~1test/get/responses/200/content/application~1json/schema'
            );

            expect(result).to.eql({
                type: 'object',
                properties: {
                    test: {
                        $ref: '#/definitions/0',
                    },
                },
                definitions: {
                    schema0: {
                        type: 'array',
                        items: { type: 'object' },
                    },
                    '1': { type: 'object' },
                    '0': {
                        type: 'object',
                        properties: {
                            next: {
                                anyOf: [
                                    { $ref: '#/definitions/schema0' },
                                    { $ref: '#/definitions/1' },
                                ],
                            },
                        },
                        additionalProperties: {
                            anyOf: [
                                {
                                    type: 'array',
                                    items: { type: 'object' },
                                },
                                { type: 'object' },
                            ],
                        },
                    },
                },
            });
        });
    });
});
