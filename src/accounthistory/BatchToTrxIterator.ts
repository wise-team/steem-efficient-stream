import * as _ from "lodash";

import { UnifiedSteemTransaction } from "../blockchain/types/UnifiedSteemTransaction";
import { AsyncIterator } from "../iterator/AsyncIterator";

export class BatchToTrxIterator implements AsyncIterator<UnifiedSteemTransaction | undefined> {
    private batchIterator: AsyncIterator<UnifiedSteemTransaction[]>;
    private currentBatch: UnifiedSteemTransaction[] = [];
    private upstreamDone: boolean = false;

    public constructor(batchIterator: AsyncIterator<UnifiedSteemTransaction[]>) {
        this.batchIterator = batchIterator;
    }

    public async next(): Promise<IteratorResult<UnifiedSteemTransaction | undefined>> {
        if (this.isDone()) throw AsyncIterator.AsyncIteratorError.iteratorAlreadyDoneError();
        await this.loadNextBatchIfRequired();

        const shifted = this.currentBatch.shift();
        if (!shifted) {
            if (!this.upstreamDone) {
                throw new Error("BatchToTrxIterator: current batch could not be shifted and upstream is not yet done");
            }
            return { done: true, value: undefined };
        }

        return { done: this.isDone(), value: _.cloneDeep(shifted) };
    }

    private async loadNextBatchIfRequired() {
        if (this.currentBatch.length === 0) {
            const { done, value } = await this.batchIterator.next();
            this.currentBatch = value;
            this.upstreamDone = done;
        }
    }

    private isDone(): boolean {
        return this.upstreamDone && this.currentBatch.length === 0;
    }
}
