import ld from 'lodash';

export function arrayToObject(values: string | string[] | undefined) {
    if (!values) {
        return values;
    }

    if (typeof values === 'string') {
        // ???
        return values;
    }

    const result: any = {};
    for (let i = 0; i < values.length; i = i + 2) {
        // Note if the array is an odd length, we'll end up with an "undefined" parameter at the end.
        result[values[i]] = values[i + 1];
    }

    return result;
}

// Converts all simple types that are not "string" into "string".
export function removeSimpleTypes(allowedTypes: string[]) {
    return ld.uniq(
        allowedTypes.map((t) => {
            if (t === 'object') {
                return 'object';
            } else if (t === 'array') {
                return 'array';
            } else {
                return 'string';
            }
        })
    );
}

export function allowedTypesToMap(allowedTypes: string[]): any {
    return allowedTypes.reduce<any>((m, t) => {
        m[t] = true;
        return m;
    }, {});
}
