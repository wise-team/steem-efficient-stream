import * as _ from "lodash";
import ow from "ow";

import { OperationWithDescriptor } from "../blockchain/types/OperationWithDescriptor";
import { UnifiedSteemTransaction } from "../blockchain/types/UnifiedSteemTransaction";
import { AsyncIterator } from "../iterator/AsyncIterator";

export class OverlappingBatchIterator implements AsyncIterator<UnifiedSteemTransaction[]> {
    private batchIterator: AsyncIterator<UnifiedSteemTransaction[]>;
    private overlapDepth: number;
    private previousBatchOverlap: UnifiedSteemTransaction[] = [];
    private done: boolean = false;

    public constructor(batchIterator: AsyncIterator<UnifiedSteemTransaction[]>, overlapDepth: number) {
        this.batchIterator = batchIterator;
        this.overlapDepth = overlapDepth;
        ow(this.overlapDepth, "overlapDepth", ow.number.integer.greaterThan(0));
    }

    public async next(): Promise<IteratorResult<UnifiedSteemTransaction[]>> {
        if (this.done) throw AsyncIterator.AsyncIteratorError.iteratorAlreadyDoneError();

        const { done, value } = await this.batchIterator.next();
        const isLastBatch = done;
        this.done = isLastBatch;
        return this.returnStrippedBatch(value, isLastBatch);
    }

    private returnStrippedBatch(takenBatch: UnifiedSteemTransaction[], isLastBatch: boolean) {
        // we are going deeper from newest to oldest, that is why previous if AFTER current batch
        const takenBatchWithPreviousOverlap = [...takenBatch, ...this.previousBatchOverlap];
        this.previousBatchOverlap = [];
        const trxsJoinedNotSorted = this.joinTrxs(takenBatchWithPreviousOverlap);
        const trxsJoinedSorted = this.sortTransactionsFromNewestToOldest(trxsJoinedNotSorted);
        if (isLastBatch) {
            return { done: true, value: trxsJoinedSorted };
        } else {
            const { passItems, overlapItems } = this.stripOverlap(trxsJoinedSorted);
            this.previousBatchOverlap = overlapItems;
            return { done: false, value: passItems };
        }
    }

    private joinTrxs(trxs: UnifiedSteemTransaction[]): UnifiedSteemTransaction[] {
        const indexed = this.indexNonJoinedTrxs(trxs);
        const trxsGroupedByTransactionId = this.groupTransactionsById(indexed);

        const joinedTrxs = _.keys(trxsGroupedByTransactionId).map(trxId => {
            const trxGroup = trxsGroupedByTransactionId[trxId];
            return this.joinTransactionGroupAndRemoveOrderIndex(trxGroup);
        });

        return joinedTrxs;
    }

    private indexNonJoinedTrxs(trxs: UnifiedSteemTransaction[]): Array<UnifiedSteemTransaction & OrderIndexed> {
        let index = 0;
        return trxs.map(trx => ({
            ...trx,
            orderIndex: index++,
        }));
    }

    private groupTransactionsById(
        trxs: Array<UnifiedSteemTransaction & OrderIndexed>,
    ): { [x: string]: Array<UnifiedSteemTransaction & OrderIndexed> } {
        return _.groupBy(trxs, (trx: UnifiedSteemTransaction) => trx.transaction_id);
    }

    private joinTransactionGroupAndRemoveOrderIndex(
        transactionGroup: Array<UnifiedSteemTransaction & OrderIndexed>,
    ): UnifiedSteemTransaction {
        const transactionGroupSorted = _.sortBy(transactionGroup, ["orderIndex"]);
        const ops: OperationWithDescriptor[] = [];
        transactionGroupSorted.forEach(trx => ops.push(...trx.ops));
        const indexedJoinedTrx: UnifiedSteemTransaction & OrderIndexed = {
            ...transactionGroup[0],
            ops,
        };
        _.unset(indexedJoinedTrx, "orderIndex");
        return indexedJoinedTrx;
    }

    private stripOverlap<T extends any>(batch: T[]): { passItems: T[]; overlapItems: T[] } {
        const batchClone = batch.slice();
        const passLength = batchClone.length - this.overlapDepth;
        const passItems = batchClone.splice(0, passLength);
        const overlapItems = batchClone;
        return { passItems, overlapItems };
    }

    private sortTransactionsFromNewestToOldest(trxs: UnifiedSteemTransaction[]): UnifiedSteemTransaction[] {
        return _.reverse(_.sortBy(trxs, ["block_num", "transaction_num"]));
    }
}

interface OrderIndexed {
    orderIndex: number;
}
