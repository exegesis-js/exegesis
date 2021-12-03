import { IValidationError } from './types';

export class ExtendableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error(message).stack;
        }
    }
}

export class HttpError extends ExtendableError {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export class HttpBadRequestError extends HttpError {
    constructor(message: string) {
        super(400, message);
    }
}

export class ValidationError extends HttpBadRequestError {
    errors: IValidationError[];

    constructor(errors: IValidationError[] | IValidationError) {
        if (!Array.isArray(errors)) {
            errors = [errors];
        }
        super(errors.length === 1 ? errors[0].message : 'Multiple validation errors');
        this.errors = errors;
    }
}

export class HttpNotFoundError extends HttpError {
    constructor(message: string) {
        super(404, message);
    }
}

export class HttpPayloadTooLargeError extends HttpError {
    constructor(message: string) {
        super(413, message);
    }
}

/**
 * Ensures the passed in `err` is of type Error.
 */
export function asError(err: any): Error {
    if (err instanceof Error) {
        return err;
    } else {
        const newErr = new Error(err);
        if (err.status) {
            (newErr as any).status = err.status;
        }
        return newErr;
    }
}
