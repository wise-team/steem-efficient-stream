import { Log } from "../Log";

import { ChainableTaker } from "./ChainableTaker";

export class SimpleTaker<T> extends ChainableTaker<T, SimpleTaker<T>> {
    public static ON_CATCH_STOP_AND_REJECT: (error: Error) => boolean = (error: Error) => {
        return false;
    }

    private callback: (item: T) => boolean;
    private onErrorCallback: (error: Error) => boolean = SimpleTaker.ON_CATCH_STOP_AND_REJECT;

    constructor(callback: (item: T) => boolean) {
        super();
        this.callback = callback;
    }

    public catch(fn: (error: Error) => boolean) {
        this.onErrorCallback = fn;
    }

    protected me(): SimpleTaker<T> {
        return this;
    }

    protected onErrorCought(error: Error) {
        this.onErrorCallback(error);
    }

    protected take(error: Error | undefined, item: T): boolean {
        if (error) {
            return this.onErrorCallback(error);
        } else {
            return this.callback(item);
        }
    }

    protected doTake(error: Error | undefined, item: T): boolean {
        if (typeof item === "undefined" && !error) {
            throw new Error("Got undefined item");
        }

        try {
            return this.take(error, item as T);
        } catch (error) {
            this.onErrorCallback(error);
            Log.log().doLog(Log.level.error, error);
            return false;
        }
    }
}
