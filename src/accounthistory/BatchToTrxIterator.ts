import * as _ from "lodash";

import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { AsyncIterator } from "../iterator/AsyncIterator";

export class BatchToTrxIterator implements AsyncIterator<UnifiedSteemTransaction> {
    private batchIterator: AsyncIterator<UnifiedSteemTransaction[]>;
    private currentBatch: UnifiedSteemTransaction[] = [];
    private done: boolean = false;

    public constructor(batchIterator: AsyncIterator<UnifiedSteemTransaction[]>) {
        this.batchIterator = batchIterator;
    }

    public async next(): Promise<IteratorResult<UnifiedSteemTransaction>> {
        if (this.done) throw AsyncIterator.AsyncIteratorError.iteratorAlreadyDoneError();
        await this.loadNextBatchIfRequired();

        const shifted = this.currentBatch.shift();
        if (!shifted) throw new Error("BatchToTrxIterator: current batch could not be shifted");

        return { done: this.done, value: shifted };
    }

    private async loadNextBatchIfRequired() {
        if (this.currentBatch.length === 0) {
            const { done, value } = await this.batchIterator.next();
            this.currentBatch = value;
            this.done = done;
        }
    }
}
