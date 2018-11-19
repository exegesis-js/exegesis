import stringToStream from "../../src/utils/stringToStream";
import {ValidationError} from "../../src/errors";

export function handleError(err: Error) {
    if(err instanceof ValidationError) {
        const errors = err.errors.map((error) => {

            let formattedError = {
                message: error.message,
            };

            if (error.location) {
                formattedError = Object.assign(formattedError, {
                    location: {
                        in: error.location.in,
                        name: error.location.name,
                        path: error.location.path,
                    }
                });
            }

            if (error.ajvError) {
                formattedError = Object.assign(formattedError, {
                    keyword: error.ajvError.keyword,
                    params: error.ajvError.params,
                });
            } else if (error.message.startsWith('Missing'))  {
                formattedError = Object.assign(formattedError, {
                    keyword: 'missing',
                });
            }

            return formattedError;
        });

        return {
            status: err.status,
            headers: {"content-type": "application/json"},
            body: stringToStream(JSON.stringify( {
                message: 'Validation errors',
                errors,
            }), 'utf-8')
        };
    } else if(Number.isInteger((err as any).status)) {
        return {
            status: (err as any).status,
            headers: {"content-type": "application/json"},
            body: stringToStream(JSON.stringify({message: err.message}), 'utf-8')
        };
    } else {
        throw err;
    }
}