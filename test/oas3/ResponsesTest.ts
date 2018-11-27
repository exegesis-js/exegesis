import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';
import * as oas3 from 'openapi3-ts';
import Oas3CompileContext from '../../src/oas3/Oas3CompileContext';
import Responses from '../../src/oas3/Responses';
import { compileOptions } from '../../src/options';
import { makeOpenApiDoc } from '../fixtures';
import stringToStream from '../../src/utils/stringToStream';

chai.use(chaiAsPromised);
const {expect} = chai;

const DEFAULT_RESPONSE = {
    200: {
        description: '',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['foo'],
                    properties: {
                        foo: {type: 'string'}
                    }
                }
            }
        }
    },
    203: {
        description: 'No content.'
    },
    default: {
        description: 'Error',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        message: {type: 'string'}
                    }
                }
            }
        }
    }
};

const RESPONSE_WITH_MULTIPLE_CONTENT_TYPES = {
    200: {
        description: '',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    required: ['foo'],
                    properties: {
                        foo: {type: 'string'}
                    }
                }
            },
            'application/xml': {
                schema: {
                    type: 'object',
                    required: ['baz'],
                    properties: {
                        baz: {type: 'string'}
                    }
                }
            }
        }
    }
};

const RESPONSE_WITH_NO_SCHEMA = {
    200: {
        description: '',
        content: {
            'application/json': {}
        }
    }
};

const RESPONSE_WITH_TEXT_PLAIN = {
    200: {
        description: '',
        content: {
            'text/plain': {}
        }
    }
};

function makeResponses(
    responses: oas3.ResponsesObject
) {
    const openApiDoc = makeOpenApiDoc();

    openApiDoc.paths['/path'] = {
        get: {responses}
    };

    const context = new Oas3CompileContext(
        openApiDoc, ['paths', '/path', 'get', 'responses'], compileOptions()
    );
    return new Responses(context, responses);
}

describe('oas3 Responses', function() {

    it('should validate a JSON response', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);
        const result = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            {foo: 'bar'},
            true
        );
        expect(result).to.eql({
            errors: null,
            isDefault: false
        });
    });

    it('should fail a bad JSON response', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);

        const result = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            {what: 'bar'},
            true
        );

        expect(result).to.eql({
            isDefault: false,
            errors: [
              {
                location: {
                  docPath: "/paths/~1path/get/responses/200/content/application~1json/schema",
                  in: "response",
                  name: "body",
                  path: ""
                },
                message: "should have required property 'foo'",
                ajvError: {
                    dataPath: '/value',
                      keyword: 'required',
                      message: 'should have required property \'foo\'',
                      params: {
                          missingProperty: 'foo',
                      },
                      schemaPath: '#/properties/value/required',
                  }
              }
            ]
        });
    });

    it('should fail a response with an unexpected content-type', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);

        const result = responses.validateResponse(
            200,
            {'content-type': 'text/plain'},
            "hello",
            true
        );

        expect(result).to.eql({
            isDefault: false,
            errors: [
              {
                location: {
                  docPath: "/paths/~1path/get/responses/200",
                  in: "response",
                  name: "body"
                },
                message: "Unexpected content-type for 200 response: text/plain."
              }
            ]
        });
    });

    it('should be strict about JSON responses', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);

        const result = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            {foo: 7}, // This should fail - no type coercion for responses.
            true
        );

        expect(result.errors!.length).to.be.greaterThan(0);
    });

    it('should fail a bad JSON response, even if validateDefaultResponses', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);

        const result = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            {what: 'bar'},
            false
        );

        expect(result.errors).to.exist;
        expect(result.errors!.length).to.equal(1);
    });

    it('should validate a default response', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);
        const result = responses.validateResponse(
            500,
            {'content-type': 'application/json'},
            {message: 'Oh noes!'},
            true
        );
        expect(result).to.eql({
            isDefault: true,
            errors: null
        });
    });

    it('should fail a default response', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);
        const result = responses.validateResponse(
            500,
            {'content-type': 'application/json'},
            {},
            true
        );

        expect(result).to.eql({
            isDefault: true,
            errors: [
              {
                location: {
                  docPath: "/paths/~1path/get/responses/default/content/application~1json/schema",
                  in: "response",
                  name: "body",
                  path: ''
                },
                message: "should have required property 'message'",
                ajvError: {
                  dataPath: '/value',
                  keyword: 'required',
                  message: 'should have required property \'message\'',
                  params: {
                      missingProperty: 'message',
                  },
                  schemaPath: '#/properties/value/required',
                },
              }
            ],
        });
    });

    it('should pass a result with no message body', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);
        const result = responses.validateResponse(
            203,
            {},
            undefined,
            true
        );
        expect(result).to.eql({
            isDefault: false,
            errors: null
        });
    });

    it('should fail a result with a message body which was not expecting a message body', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);
        const result = responses.validateResponse(
            203,
            {},
            "hello",
            true
        );
        expect(result.errors).to.exist;
        expect(result.errors!.length).to.be.greaterThan(0);
    });

    it('should not fail a default response if validateDefaultResponses is false', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);
        const result = responses.validateResponse(
            500,
            {'content-type': 'application/json'},
            {},
            false
        );

        expect(result).to.eql({
            isDefault: true,
            errors: null
        });
    });

    it('should validate JSON strings', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);

        const body = '{"what": "bar"}';
        const result = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            body,
            true
        );

        expect(result.errors).to.have.length(1);
    });

    it('should not validate non-JSON strings', async function() {
        const responses = makeResponses(RESPONSE_WITH_TEXT_PLAIN);

        const body = '{"what": "bar"}';
        const result = responses.validateResponse(
            200,
            {'content-type': 'text/plain'},
            body,
            true
        );

        expect(result).to.eql({
            isDefault: false,
            errors: null
        });
    });

    it('should skip validation for buffers, strings, and streams', async function() {
        const responses = makeResponses(DEFAULT_RESPONSE);

        const cases = [
            {type: 'Buffer', body: Buffer.from('{"what": "bar"}')},
            {type: 'Readable', body: stringToStream('{"what": "bar"}')}
        ];

        for(const {type, body} of cases) {
            const result = responses.validateResponse(
                200,
                {'content-type': 'application/json'},
                body,
                true
            );

            expect(result, `result for ${type}`).to.eql({
                isDefault: false,
                errors: null
            });
        }
    });

    it('should validate a JSON response for a result with multiple content-types', async function() {
        const responses = makeResponses(RESPONSE_WITH_MULTIPLE_CONTENT_TYPES);
        const jsonResult = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            {foo: 'bar'},
            true
        );
        expect(jsonResult, 'jsonResult').to.eql({
            errors: null,
            isDefault: false
        });

        const erroredJsonResult = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            {foo: 7},
            true
        );
        expect(erroredJsonResult.errors, 'erroredJsonResult').to.exist;
        expect(erroredJsonResult.errors!.length, 'erroredJsonResult').to.be.greaterThan(0);

        const xmlResult = responses.validateResponse(
            200,
            {'content-type': 'application/xml'},
            {baz: 'qux'},
            true
        );
        expect(xmlResult, 'xmlResult').to.eql({
            errors: null,
            isDefault: false
        });

        // This is highly unlikely - no one is going to ever do this, since
        // we'd end up writing the XML out as JSON.  Maybe we should
        // support some kind of "responseWriter" plugin to custom convert
        // JSON objects to XML?
        const erroredXmlResult = responses.validateResponse(
            200,
            {'content-type': 'application/xml'},
            {baz: 7},
            true
        );
        expect(erroredXmlResult.errors, 'erroredXmlResult').to.exist;
        expect(erroredXmlResult.errors!.length, 'erroredXmlResult').to.be.greaterThan(0);

    });

    it('should validate a response with no schema', async function() {
        const responses = makeResponses(RESPONSE_WITH_NO_SCHEMA);
        const result = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            {foo: 'bar'},
            true
        );
        expect(result).to.eql({
            errors: null,
            isDefault: false
        });
    });

    it('should fail a message with a content-type and no body', async function() {
        const responses = makeResponses(RESPONSE_WITH_NO_SCHEMA);
        const result = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            undefined,
            true
        );
        expect(result.errors![0].message).to.equal('Missing response body for 200.');
    });

    it('should pass a message with a content-type and a zero-length body', async function() {
        const responses = makeResponses(RESPONSE_WITH_NO_SCHEMA);
        const result = responses.validateResponse(
            200,
            {'content-type': 'application/json'},
            '',
            true
        );
        expect(result).to.eql({
            errors: null,
            isDefault: false
        });
    });

    it('should fail a message with a more than one content-type header', async function() {
        const responses = makeResponses(RESPONSE_WITH_NO_SCHEMA);
        const result = responses.validateResponse(
            200,
            {'content-type': ['application/json', 'text/plain']},
            '',
            true
        );
        expect(result.errors![0].message).to.equal(
            'Invalid content type for 200 response: application/json,text/plain');
    });

    it('should fail for an undefined status code if there is no default', async function() {
        const responses = makeResponses(RESPONSE_WITH_NO_SCHEMA);
        const result = responses.validateResponse(
            404,
            {'content-type': 'text/plain'},
            'Not found',
            true
        );
        expect(result.errors![0].message).to.equal('No response defined for status code 404.');
    });

});