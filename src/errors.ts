import ld from 'lodash';
import {IValidationError} from './types/common';

export class ExtendableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

export class HttpBadRequestError extends ExtendableError {
    readonly status = 400;
    constructor(message: string) {
        super(message);
    }
}

export class ValidationError extends HttpBadRequestError {
    errors: IValidationError[];

    constructor(
        errors: IValidationError[] | IValidationError
    ) {
        if(!ld.isArray(errors)) {
            errors = [errors];
        }
        super(errors.length === 1 ? errors[0].message : 'Multiple validation errors');
        this.errors = errors;
    }
}

export class HttpNotFoundError extends ExtendableError {
    readonly status = 404;
    constructor(message: string) {
        super(message);
    }
}
