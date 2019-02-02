import * as steem from "steem";
import * as _ from "lodash";
import ow from "ow";
import { ChainableTransformer } from "../chainable/Chainable";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";

export class BatchOverlapTrxJoiner extends ChainableTransformer<
    UnifiedSteemTransaction[],
    UnifiedSteemTransaction,
    BatchOverlapTrxJoiner
> {
    private overlapDepth: number;
    private previousBatchOverlap: UnifiedSteemTransaction[] = [];

    public constructor(overlapDepth: number) {
        super();

        this.overlapDepth = overlapDepth;
        ow(this.overlapDepth, ow.number.integer.greaterThan(0).label("overlapDepth"));
    }

    protected me(): BatchOverlapTrxJoiner {
        return this;
    }

    protected take(error: Error | undefined, takenBatchNonJoinedTrxs: UnifiedSteemTransaction[]): boolean {
        if (error) throw error;

        const takenBatchWithPreviousOverlap = [...this.previousBatchOverlap, ...takenBatchNonJoinedTrxs];
        const takenBatchJoinedTrxs = this.joinTrxs(takenBatchWithPreviousOverlap);
        const { passItems, overlapItems } = this.stripOverlap(takenBatchJoinedTrxs);
        this.previousBatchOverlap = overlapItems;
        console.log(`BatchOverlapTrxJoiner: passItems=[${passItems.length}], overlapItems=[${overlapItems.length}]`);

        for (const trx of passItems) {
            const takerWantsMore = this.give(undefined, trx);
            if (!takerWantsMore) return false;
        }
        return true;
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
        console.log(
            JSON.stringify({
                batchClone: batchClone.length,
                overlapDepth: this.overlapDepth,
                passLength,
                passItems: passItems.length,
                overlapItems: overlapItems.length,
            })
        );
        return { passItems, overlapItems };
    }

    private sortTransactionsFromNewestToOldest(trxs: UnifiedSteemTransaction[]): UnifiedSteemTransaction[] {
        return _.reverse(_.sortBy(trxs, ["block_num", "transaction_num"]));
    }
}
