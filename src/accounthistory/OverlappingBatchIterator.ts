import * as _ from "lodash";
import ow from "ow";
import * as steem from "steem";

import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { AsyncIterator } from "../iterator/AsyncIterator";

export class OverlappingBatchIterator implements AsyncIterator<UnifiedSteemTransaction[]> {
    private batchIterator: AsyncIterator<UnifiedSteemTransaction[]>;
    private overlapDepth: number;
    private previousBatchOverlap: UnifiedSteemTransaction[] = [];

    public constructor(batchIterator: AsyncIterator<UnifiedSteemTransaction[]>, overlapDepth: number) {
        this.batchIterator = batchIterator;
        this.overlapDepth = overlapDepth;
        ow(this.overlapDepth, "overlapDepth", ow.number.integer.greaterThan(0));
    }

    public async next(): Promise<IteratorResult<UnifiedSteemTransaction[]>> {
        // console.log("OverlappingBatchIterator.next");
        const { done, value } = await this.batchIterator.next();
        if (done) {
            // console.log(`BatchIterator returned ${JSON.stringify({ done, valueL: value.length })}`);
            return this.returnLastBatchWithPrevOverlap(value);
        }

        // console.log("Returning stripped batch");
        return this.returnStrippedBatch(value);
    }

    private returnLastBatchWithPrevOverlap(value: UnifiedSteemTransaction[]) {
        if (this.previousBatchOverlap.length > 0) {
            const nonJoinedTrxs = [...this.previousBatchOverlap, ...value];
            this.previousBatchOverlap = [];

            const joinedTrxs = this.joinTrxs(nonJoinedTrxs);
            return { done: true, value: joinedTrxs };
        }
        return { done: true, value: [] };
    }

    private returnStrippedBatch(takenBatch: UnifiedSteemTransaction[]) {
        const takenBatchWithPreviousOverlap = [...this.previousBatchOverlap, ...takenBatch];
        const takenBatchJoinedTrxs = this.joinTrxs(takenBatchWithPreviousOverlap);
        const { passItems, overlapItems } = this.stripOverlap(takenBatchJoinedTrxs);
        this.previousBatchOverlap = overlapItems;
        return { done: false, value: passItems };
    }

    private joinTrxs(trxs: UnifiedSteemTransaction[]): UnifiedSteemTransaction[] {
        const trxsGroupedByTransactionId = this.groupTransactionsById(trxs);

        const joinedTrxs = _.keys(trxsGroupedByTransactionId).map(trxId => {
            const trxGroup = trxsGroupedByTransactionId[trxId];
            return this.joinTransactionGroup(trxGroup);
        });

        return this.sortTransactionsFromNewestToOldest(joinedTrxs);
    }

    private groupTransactionsById(trxs: UnifiedSteemTransaction[]): { [x: string]: UnifiedSteemTransaction[] } {
        return _.groupBy(trxs, (trx: UnifiedSteemTransaction) => trx.transaction_id);
    }

    private joinTransactionGroup(transactionGroup: UnifiedSteemTransaction[]): UnifiedSteemTransaction {
        const ops: steem.OperationWithDescriptor[] = [];
        transactionGroup.forEach(trxs => ops.push(...trxs.ops));
        return {
            ...transactionGroup[0],
            ops: _.reverse(ops),
        };
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
