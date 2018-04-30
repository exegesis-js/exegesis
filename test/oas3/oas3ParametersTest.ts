import oas3 from 'openapi3-ts';
import { expect } from 'chai';
import { defaultCompiledOptions } from '../fixtures';
import OpenApi from '../../src/oas3/OpenApi';

const pathStyles = ['simple', 'matrix' /*TODO: , 'label' */];
const queryStyles = ['form', 'pipeDelimited', 'spaceDelimited', 'deepObject'];

// "Integration tests" which check to veryify we can match a path and extract
// various kinds of parameters correctly.

function generateOpenApi(paths: oas3.PathObject) : OpenApi {
    return new OpenApi({
        openapi: '3.0.1',
        info: {
            title: 'Test API',
            version: '1.0.0'
        },
        paths: paths
    }, defaultCompiledOptions);
}

const types : {[key: string]: any} = {
    "string": {
        schema: {type: 'string'},
        samples: [{
            value: 'foo',
            simple: 'foo',
            form: '?var=foo',
            matrix: ';var=foo',
            label: '.foo'
        }, {
            value: '',
            simple: '',
            form: '?var=',
            matrix: ';var',
            label: '.'
        }]
    },
    "array": {
        schema: {type: 'array'},
        samples: [{
            value: ['foo', 'bar,baz'],
            simple: 'foo,bar%2Cbaz',
            form: '?var=foo,bar%2Cbaz',
            pipeDelimited: '?var=foo|bar%2Cbaz',
            spaceDelimited: '?var=foo bar%2Cbaz',
            matrix: ';var=foo,bar%2Cbaz',
            label: '.foo.bar%2Cbaz'
        }, {
            value: ['foo'],
            simple: 'foo',
            form: '?var=foo',
            pipeDelimited: '?var=foo',
            spaceDelimited: '?var=foo',
            matrix: ';var=foo',
            label: '.foo'
        }]
    },
    "exploded-array": {
        schema: {type: 'array'},
        explode: true,
        samples: [{
            value: ['foo', 'bar,baz'],
            simple: 'foo,bar%2Cbaz',
            form: '?var=foo&var=bar%2Cbaz',
            pipeDelimited: '?var=foo|bar%2Cbaz',
            spaceDelimited: '?var=foo bar%2Cbaz',
            matrix: ';var=foo;var=bar%2Cbaz',
            label: '.foo.bar%2Cbaz'
        }, {
            value: ['foo'],
            simple: 'foo',
            form: '?var=foo',
            matrix: ';var=foo',
            label: '.foo'
        }]
    },
    "object": {
        schema: {type: 'object'},
        samples: [{
            value: {semi: ';', dot: '.', comma: ','},
            simple: 'semi,%3B,dot,.,comma,%2C',
            form: '?var=semi,%3B,dot,.,comma,%2C',
            matrix: ';var=semi,%3B,dot,.,comma,%2C',
            label: '.semi,%3B,dot,.,comma,%2C',
            deepObject: '?var[semi]=%3B&var[dot]=.&var[comma]=%2C'
        }]
    },
    "explodedObject": {
        schema: {type: 'object'},
        explode: true,
        samples: [{
            value: {semi: ';', dot: '.', comma: ','},
            simple: 'semi=%3B,dot=.,comma=%2C',
            form: '?semi=%3B&dot=.&comma=%2C',
            matrix: ';semi=%3B;dot=.;comma=%2C',
            // label: '.semi=%3B.dot=..comma=%2C', // This makes no sense.  How would you ever parse this?  O_o
            deepObject: '?var[semi]=%3B&var[dot]=.&var[comma]=%2C'
        }]
    },
    "mixed": {
        schema: {
            anyOf: [{type: 'string'}, {type: 'array'}]
        },
        samples: [{
            value: 'foo',
            simple: 'foo',
            form: '?var=foo'
        }, {
            value: ['foo', 'bar'],
            simple: 'foo,bar',
            form: '?var=foo,bar',
            pipeDelimited: '?var=foo|bar',
            spaceDelimited: '?var=foo bar'
        }]
    }
};

describe('oas3 integration parameter parsing', function() {
    describe('path parameters', function() {
        for(const typeName of Object.keys(types)) {
            const typeDef = types[typeName];

            for(const pathStyle of pathStyles) {
                for(const sample of typeDef.samples) {
                    if(!(pathStyle in sample)) {
                        continue;
                    }
                    it(`should correctly parse ${typeName} with ${pathStyle} style: ${sample[pathStyle]}`, function() {
                        const openApi = generateOpenApi({
                            [`/path-${pathStyle}-${typeName}/{var}`]: {
                                parameters: [{
                                    name: 'var',
                                    in: 'path',
                                    required: true,
                                    style: pathStyle,
                                    schema: typeDef.schema,
                                    explode: typeDef.explode || false
                                }],
                                get: {
                                    responses: {default: {description: ''}}
                                }
                            }
                        });

                        const result = openApi.resolve(
                            'GET',
                            `/path-${pathStyle}-${typeName}/${sample[pathStyle]}`,
                            {}
                        );

                        expect(result!.operation!.parseParameters!().path.var).to.eql(sample.value);
                    });
                }
            }
        }
    });

    describe('header parameters', function() {
        for(const typeName of Object.keys(types)) {
            const typeDef = types[typeName];

            const generateHeaderDoc = () => {
                const openApi = generateOpenApi({
                    [`/header-${typeName}`]: {
                        parameters: [{
                            name: 'x-custom-header',
                            in: 'header',
                            required: false,
                            style: 'simple',
                            schema: typeDef.schema,
                            explode: typeDef.explode || false
                        }],
                        get: {
                            responses: {default: {description: ''}}
                        }
                    }
                });
                return openApi;
           };

            for(const sample of typeDef.samples) {
                it(`should correctly parse ${typeName} with simple style: ${sample.simple}`, function() {
                    const openApi = generateHeaderDoc();
                    const result = openApi.resolve(
                        'GET',
                        `/header-${typeName}`,
                        {'x-custom-header': sample.simple}
                    );

                    expect(result!.operation!.parseParameters!().header['x-custom-header']).to.eql(sample.value);
                });

            }

            it(`should correctly parse ${typeName} with simple style: undefined`, function() {
                const openApi = generateHeaderDoc();
                const result = openApi.resolve(
                    'GET',
                    `/header-${typeName}`,
                    {}
                );

                expect(result!.operation!.parseParameters!().header['x-custom-header']).to.eql(undefined);
            });
        }
    });

    describe('query parameters', function() {
        for(const typeName of Object.keys(types)) {
            const typeDef = types[typeName];

            for(const style of queryStyles) {
                const explodeStr = typeDef.explode ? 'explode' : '';

                const generateQueryOpenApi = () => {
                    const openApi = generateOpenApi({
                        [`/query-${typeName}-${explodeStr}`]: {
                            parameters: [{
                                name: 'var',
                                in: 'query',
                                required: false,
                                style,
                                schema: typeDef.schema,
                                explode: typeDef.explode || false
                            }],
                            get: {
                                responses: {default: {description: ''}}
                            }
                        }
                    });
                    return openApi;
                };

                for(const sample of typeDef.samples) {
                    if(!(style in sample)) {
                        continue;
                    }
                    it(`should correctly parse ${typeName} with ${style} style: ${sample.simple}`, function() {
                        const openApi = generateQueryOpenApi();
                        const result = openApi.resolve(
                            'GET',
                            `/query-${typeName}-${explodeStr}${sample[style]}`,
                            {}
                        );

                        expect(result, 'matched a route').to.exist;
                        expect(result!.operation!.parseParameters!().query.var).to.eql(sample.value);
                    });
                }

                it(`should correctly parse ${typeName} with ${style} style: undefined`, function() {
                    const openApi = generateQueryOpenApi();
                    const result = openApi.resolve(
                        'GET',
                        `/query-${typeName}-${explodeStr}`,
                        {}
                    );

                    const expected = (typeName === 'explodedObject' && style === 'form')
                        ? {}
                        : undefined;
                    expect(result!.operation!.parseParameters!().query.var).to.eql(expected);
                });

                // TODO: deepObject, pipe and space delimited.
            }
        }

        it(`should correctly parse deepObject style`, function() {
            const openApi = generateOpenApi({
                ['/query']: {
                    parameters: [{
                        name: 'var',
                        in: 'query',
                        required: false,
                        style: 'deepObject',
                        schema: {type: 'object'}
                    }],
                    get: {
                        responses: {default: {description: ''}}
                    }
                }
            });

            let result = openApi.resolve(
                'GET',
                `/query?var[a]=b&var[c]=d`,
                {}
            );
            expect(result!.operation!.parseParameters!().query.var).to.eql({a:'b', c: 'd'});

            result = openApi.resolve(
                'GET',
                `/query`,
                {}
            );
            expect(result!.operation!.parseParameters!().query.var).to.eql(undefined);
        });

        for(const style of [
            {style: 'pipeDelimited', delimiter: '|'},
            {style: 'spaceDelimited', delimiter: ' '}
        ]) {
            it(`should correctly parse ${style.style} style`, function() {
                const openApi = generateOpenApi({
                    ['/query']: {
                        parameters: [{
                            name: 'var',
                            in: 'query',
                            required: false,
                            style: style.style,
                            schema: {type: 'array'}
                        }],
                        get: {
                            responses: {default: {description: ''}}
                        }
                    }
                });

                let result = openApi.resolve(
                    'GET',
                    `/query?var=a${style.delimiter}b${style.delimiter}c`,
                    {}
                );
                expect(result!.operation!.parseParameters!().query.var).to.eql(['a', 'b', 'c']);

                result = openApi.resolve(
                    'GET',
                    `/query?var=a`,
                    {}
                );
                expect(result!.operation!.parseParameters!().query.var).to.eql(['a']);

                result = openApi.resolve(
                    'GET',
                    `/query`,
                    {}
                );
                expect(result!.operation!.parseParameters!().query.var).to.eql(undefined);
            });
        }

    });

});