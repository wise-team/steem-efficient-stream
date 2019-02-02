import * as steem from "steem";
import * as _ from "lodash";
import ow from "ow";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { NonJoinedBatchFetch } from "./NonJoinedBatchFetch";

export class OverlapTrxJoiningBatchBuffer {
    private batchFetch: NonJoinedBatchFetch;
    private overlapDepth: number;
    private previousBatchOverlap: UnifiedSteemTransaction[] = [];

    public constructor(batchFetch: NonJoinedBatchFetch, overlapDepth: number) {
        this.batchFetch = batchFetch;
        this.overlapDepth = overlapDepth;
        ow(this.overlapDepth, ow.number.integer.greaterThan(0).label("overlapDepth"));
    }

    public async nextBatch(): Promise<UnifiedSteemTransaction[] | undefined> {
        const takenBatch = await this.batchFetch.getNextBatch();
        if (!takenBatch) return this.returnLastOverlap();
        else return this.returnStrippedBatch(takenBatch);
    }

    private async returnLastOverlap() {
        if (this.previousBatchOverlap.length > 0) {
            const toReturn = this.previousBatchOverlap;
            this.previousBatchOverlap = [];
            return toReturn;
        }
        return undefined;
    }

    private async returnStrippedBatch(takenBatch: UnifiedSteemTransaction[]) {
        const takenBatchWithPreviousOverlap = [...this.previousBatchOverlap, ...takenBatch];
        const takenBatchJoinedTrxs = this.joinTrxs(takenBatchWithPreviousOverlap);
        const { passItems, overlapItems } = this.stripOverlap(takenBatchJoinedTrxs);
        this.previousBatchOverlap = overlapItems;
        return passItems;
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

    private stripOverlap<T extends any>(batch_: T[]): { passItems: T[]; overlapItems: T[] } {
        const batchClone = batch_.slice();
        const passLength = batchClone.length - this.overlapDepth;
        const passItems = batchClone.splice(0, passLength);
        const overlapItems = batchClone;
        return { passItems, overlapItems };
    }

    private sortTransactionsFromNewestToOldest(trxs: UnifiedSteemTransaction[]): UnifiedSteemTransaction[] {
        return _.reverse(_.sortBy(trxs, ["block_num", "transaction_num"]));
    }
}
