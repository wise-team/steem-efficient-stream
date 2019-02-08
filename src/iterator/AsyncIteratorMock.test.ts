import { AsyncIterator } from "./AsyncIterator";

export class AsyncIteratorMock<T> implements AsyncIterator<T> {
    private values: T[];

    public constructor(values: T[]) {
        this.values = values;
    }

    public async next(): Promise<IteratorResult<T>> {
        const shifted = this.values.shift();
        if (shifted) {
            return { value: shifted, done: this.values.length === 0 };
        } else throw AsyncIterator.AsyncIteratorError.iteratorAlreadyDoneError();
    }
}

export namespace AsyncIteratorMock {
    export interface SampleObject {
        v: number;
    }
}
