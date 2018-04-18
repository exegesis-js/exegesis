import qs from 'qs';

export class ParserContext {
    queryString: string | undefined;
    private _qs: any | undefined;

    constructor(queryString: string | undefined) {
        this.queryString = queryString;
    }

    get qs() : any {
        if(!this._qs && this.queryString) {
            this._qs = qs.parse(this.queryString);
        }
        return this._qs;
    }
}