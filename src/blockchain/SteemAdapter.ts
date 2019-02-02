import ow from "ow";
import * as steem from "steem";
import { CustomError } from "universe-log";

export interface SteemAdapter {
    getAccountHistoryAsync(username: string, from: number, limit: number): Promise<steem.AccountHistory.Operation[]>;
}

export namespace SteemAdapter {
    export function isSteemAdapter(o: any): o is SteemAdapter {
        return (o as SteemAdapter).getAccountHistoryAsync !== undefined;
    }

    export interface Options {
        url: string;
    }

    export namespace Options {
        export function validate(o: Options) {
            ow(o.url, ow.string.nonEmpty.label("SteemAdapter.Options.url"));
        }
    }

    export class SteemError extends CustomError {
        public constructor(message?: string, cause?: Error) {
            super(message, cause);
        }
    }
}
