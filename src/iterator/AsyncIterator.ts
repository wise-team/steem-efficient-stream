import { CustomError } from "universe-log";

export interface AsyncIterator<T> {
    next(value?: any): Promise<IteratorResult<T>>;
}

export namespace AsyncIterator {
    export class AsyncIteratorError extends CustomError {
        public static iteratorAlreadyDoneError(msg?: string): AsyncIteratorError {
            return new AsyncIteratorError(`This iterator was already done ${msg ? ": " + msg : "."}`);
        }

        public constructor(message?: string, cause?: Error) {
            super(message, cause);
        }
    }
}
