import { ChainableSupplier } from "../chainable/ChainableSupplier";

import { AsyncIterator } from "./AsyncIterator";

export class AsyncIteratorChainableSupplier<T> extends ChainableSupplier<T, AsyncIteratorChainableSupplier<T>> {
    private iterator: AsyncIterator<T>;
    private done: boolean = false;

    constructor(iterator: AsyncIterator<T>) {
        super();

        this.iterator = iterator;
    }

    public async start(): Promise<void> {
        while (!this.done) {
            const { done } = await this.next();
            this.done = done;
        }
    }

    protected me(): AsyncIteratorChainableSupplier<T> {
        return this;
    }

    private async next(): Promise<{ done: boolean }> {
        try {
            const { value, done } = await this.iterator.next();
            const takerWantsMore = this.give(undefined, value);
            return { done: done || !takerWantsMore };
        } catch (error) {
            const takerWantsMore = this.give(error, undefined);
            if (!takerWantsMore) {
                throw error;
            }
            return { done: !takerWantsMore };
        }
    }
}
