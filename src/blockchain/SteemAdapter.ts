import ow from "ow";
import { CustomError } from "universe-log";

import { AccountHistoryOperation } from "./types/AccountHistoryOperation";

export interface SteemAdapter {
    getAccountHistoryAsync(username: string, from: number, limit: number): Promise<AccountHistoryOperation[]>;
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
            ow(o.url, "SteemAdapter.Options.url", ow.string.nonEmpty);
        }
    }

    export class SteemError extends CustomError {
        public constructor(message?: string, cause?: Error) {
            super(message, cause);
        }
    }
}
