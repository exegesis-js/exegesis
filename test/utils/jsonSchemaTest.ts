import 'mocha';
import {expect} from 'chai';

import * as jsonSchema from '../../src/utils/jsonSchema';

describe("jsonSchema utils", function() {
    describe("extractSchema", function() {
        it('should extract a schema from a parent document and resolve refs', function() {
            const doc = {
                myDoc: {
                    someStuff: {
                        schema: {
                            type: 'object',
                            properties: {
                                users: {type: 'array', items: {$ref: '#/defs/User'}},
                                menu: {$ref: '#/defs/Menu'}
                            }
                        }
                    }
                },
                defs: {
                    name: {type: 'string'},
                    User: {
                        type: 'object',
                        properties: {
                            name: {$ref: '#/defs/name'}
                        }
                    },
                    Menu: {
                        type: 'object',
                        properties: {
                            items: {type: 'array', items: {$ref: '#/defs/MenuItem'}}
                        }
                    },
                    MenuItem: {
                        oneOf: [
                            // Circular ref
                            {$ref: '#/defs/Menu'},
                            {type: 'string'}
                        ]
                    }
                }
            };

            debugger;
            const result = jsonSchema.extractSchema(doc, '#/myDoc/someStuff/schema');
            expect(result).to.eql({
                "type": "object",
                "properties": {
                    users: {type: "array", items: {"$ref": "#/definitions/User"}
                    },
                    "menu": {
                        "$ref": "#/definitions/Menu"
                    }
                },
                "definitions": {
                    name: {type: 'string'},
                    User: {
                        type: 'object',
                        properties: {
                            name: {"$ref": "#/definitions/name"}
                        }
                    },
                    Menu: {
                        type: 'object',
                        properties: {
                            items: {type: 'array', items: {$ref: '#/definitions/MenuItem'}}
                        }
                    },
                    MenuItem: {
                        oneOf: [
                            // Circular ref
                            {$ref: '#/definitions/Menu'},
                            {type: 'string'}
                        ]
                    }
                }
            });
        });
    });
});
