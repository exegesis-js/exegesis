import ld from 'lodash';
import { ParameterParser, ValuesBag } from ".";
import { ParameterLocation } from "../../types/validation";
import { simpleParser, simpleKeysParser } from "./simpleParser";

export function generateFormStyleQueryParser(
    parameterLocation: ParameterLocation,
    isKeys: boolean,
    explode: boolean
) : ParameterParser {
    let result : ParameterParser;

    if(!isKeys) {
        if(!explode) {
            result = generateFormParser(parameterLocation);
        } else {
            result = generateExplodedFormParser(parameterLocation);
        }
    } else if(!explode) {
        result = generateKeysParser(parameterLocation);
    } else {
        result = generateExplodedKeysParser();
    }

    return result;
}

function generateFormParser(loc: ParameterLocation) {
    return function formParser(values: ValuesBag) {
        const value = values[loc.name];
        if(Array.isArray(value)) {
            // We *should* not receive multiple form headers.  If this happens,
            // it's probably because the client used explode when they shouldn't
            // have.  Like generateExplodedFormParser() below, if values contain
            // ","s, we just pass them through.
            return value.map(decodeURIComponent);
        } else {
            return value? simpleParser(value) : value;
        }
    };
}

function generateExplodedFormParser(loc: ParameterLocation) {
    return function explodedListFormParser(values: ValuesBag) {
        let value = values[loc.name];
        if(!value) {
            return value;
        }

        if(!Array.isArray(value)) {
            value = [value];
        }

        // TODO: We *should* not receive values that contain ","s for an
        // exploded form-style query value, since this would violate RFC 6570.
        // But if we do... what should we do?  If we receive:
        //
        //     ?var=foo&bar=bar,baz
        //
        // We could return any of the following, or even throw an error:
        //
        //     ['foo', 'bar', 'baz']
        //     ['foo', ['bar', 'baz']]
        //     ['foo', 'bar,baz']
        //
        // We do that last one, because it's probably the one that makes the
        // most sense.
        //
        return value.map(decodeURIComponent);
    };
}

function generateKeysParser(loc: ParameterLocation) {
    return function keysFormParser(values: ValuesBag) {
        const value = values[loc.name];
        return formKeysParser(value, loc);
    };
}

function formKeysParser(value: string | string[] | undefined, loc: ParameterLocation) : any {
    if(value === null || value === undefined) {
        return value;
    } else if(Array.isArray(value)) {
        // Client is supposed to be sending us something like '?var=a,b,c,d'
        // for `{a: 'b', c: 'd'}`, but they've sent us more than one `var`.
        // The client is not conforming to the spec...  We want to return
        // *something* though, so we'll return an array of objects.
        return value.map(v => formKeysParser(v,loc));
    } else {
        return simpleKeysParser(value, loc);
    }
}

function generateExplodedKeysParser() {
    return function explodedKeysFormParser(values: ValuesBag) {
        return ld.mapValues(values, v => {
            if(Array.isArray(v)) {
                return v.map(decodeURIComponent);
            } else if(v) {
                return decodeURIComponent(v);
            } else {
                return v;
            }
        });
    };
}
