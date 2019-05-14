import ld from 'lodash';

import { MimeTypeRegistry } from './utils/mime';
import TextBodyParser from './bodyParsers/TextBodyParser';
import JsonBodyParser from './bodyParsers/JsonBodyParser';
import BodyParserWrapper from './bodyParsers/BodyParserWrapper';
import { loadControllersSync } from './controllers/loadControllers';

import {
    CustomFormats,
    ExegesisOptions,
    StringParser,
    BodyParser,
    Controllers,
    Authenticators,
    MimeTypeParser,
    ResponseValidationCallback,
} from './types';
import { handleErrorFunction } from './types/options';

export interface ExegesisCompiledOptions {
    customFormats: CustomFormats;
    controllers: Controllers;
    authenticators: Authenticators;
    bodyParsers: MimeTypeRegistry<BodyParser>;
    parameterParsers: MimeTypeRegistry<StringParser>;
    defaultMaxBodySize: number;
    ignoreServers: boolean;
    allowMissingControllers: boolean;
    autoHandleHttpErrors: boolean | handleErrorFunction;
    onResponseValidationError: ResponseValidationCallback;
    validateDefaultResponses: boolean;
    allErrors: boolean;
}

const INT_32_MAX = Math.pow(2, 32) - 1;
// Actually 18446744073709551616-1, but Javascript doesn't handle integers this large.
const INT_64_MAX = 18446744073709556000;

const defaultValidators: CustomFormats = {
    // string:date is taken care of for us:
    // https://github.com/epoberezkin/ajv/blob/797dfc8c2b0f51aaa405342916cccb5962dd5f21/lib/compile/formats.js#L34
    // string:date-time is from https://tools.ietf.org/html/draft-wright-json-schema-validation-00#section-7.3.1.
    int32: {
        type: 'number',
        validate: (value: number) => value >= 0 && value <= INT_32_MAX,
    },
    int64: {
        type: 'number',
        validate: (value: number) => value >= 0 && value <= INT_64_MAX,
    },
    double: {
        type: 'number',
        validate: () => true,
    },
    float: {
        type: 'number',
        validate: () => true,
    },
    // Nothing to do for 'password'; this is just a hint for docs.
    password: () => true,
    // Impossible to validate "binary".
    binary: () => true,
    // `byte` is base64 encoded data.  We *could* validate it here, but if the
    // string is long, we might take a while to do it, and the application will
    // figure it out quickly enough when it tries to decode it, so we just
    // pass it along.
    byte: () => true,
    // Not defined by OAS 3, but it's used throughout OAS 3.0.1, so we put it
    // here as an alias for 'byte' just in case.
    base64: () => true,
};

export function compileOptions(options: ExegesisOptions = {}): ExegesisCompiledOptions {
    const maxBodySize = options.defaultMaxBodySize || 100000;

    const mimeTypeParsers = Object.assign(
        {
            'text/*': new TextBodyParser(maxBodySize),
            'application/json': new JsonBodyParser(maxBodySize),
        },
        options.mimeTypeParsers || {}
    );

    const wrappedBodyParsers = ld.mapValues(
        mimeTypeParsers,
        (p: StringParser | BodyParser | MimeTypeParser) => {
            if ('parseReq' in p) {
                return p;
            } else if (p.parseString) {
                return new BodyParserWrapper(p, maxBodySize);
            } else {
                return undefined;
            }
        }
    );
    const bodyParsers = new MimeTypeRegistry<BodyParser>(wrappedBodyParsers);

    const parameterParsers = new MimeTypeRegistry<StringParser>(ld.pickBy(
        mimeTypeParsers,
        (p: any) => !!p.parseString
    ) as { [mimeType: string]: StringParser });

    const customFormats = Object.assign({}, defaultValidators, options.customFormats || {});

    const contollersPattern = options.controllersPattern || '**/*.js';
    const controllers =
        typeof options.controllers === 'string'
            ? loadControllersSync(options.controllers, contollersPattern)
            : options.controllers || {};

    const allowMissingControllers =
        'allowMissingControllers' in options ? !!options.allowMissingControllers : true;

    const authenticators: Authenticators = options.authenticators || {};

    let autoHandleHttpErrors: boolean | handleErrorFunction = true;
    if (options.autoHandleHttpErrors !== undefined) {
        if (options.autoHandleHttpErrors instanceof Function) {
            autoHandleHttpErrors = options.autoHandleHttpErrors;
        } else {
            autoHandleHttpErrors = !!options.autoHandleHttpErrors;
        }
    }

    const validateDefaultResponses =
        'validateDefaultResponses' in options ? !!options.validateDefaultResponses : true;

    return {
        bodyParsers,
        controllers,
        authenticators,
        customFormats,
        parameterParsers,
        defaultMaxBodySize: maxBodySize,
        ignoreServers: options.ignoreServers || false,
        allowMissingControllers,
        autoHandleHttpErrors,
        onResponseValidationError: options.onResponseValidationError || (() => void 0),
        validateDefaultResponses,
        allErrors: options.allErrors || false,
    };
}
