import ow from "ow";

import { BlockchainConfig } from "../blockchain/BlockchainConfig";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { AccountHistoryOperation } from "../blockchain/types/AccountHistoryOperation";
import { UnifiedSteemTransaction } from "../blockchain/types/UnifiedSteemTransaction";
import { AsyncIterator } from "../iterator/AsyncIterator";
import { Log } from "../Log";
import { SteemISODateParser } from "../util/SteemISODateParser";

export class RawBatchIterator implements AsyncIterator<UnifiedSteemTransaction[]> {
    private exclusiveBatchSize: number;
    private account: string;
    private steemAdapter: SteemAdapter;
    private nextFrom: number = -1;

    public constructor(props: { steemAdapter: SteemAdapter; account: string; batchSize: number }) {
        ow(props.steemAdapter, "steemAdapter", ow.object.is(o => SteemAdapter.isSteemAdapter(o)));
        this.steemAdapter = props.steemAdapter;

        ow(props.account, "account", ow.string.minLength(3));
        this.account = props.account;

        ow(props.batchSize, "batchSize", ow.number.integer.inRange(0, BlockchainConfig.ACCOUNT_HISTORY_MAX_BATCH_SIZE));
        const inclusiveBatchSize = props.batchSize;
        this.exclusiveBatchSize = this.inclusiveToExclusiveBatchSize(inclusiveBatchSize);
    }

    public async next(): Promise<IteratorResult<UnifiedSteemTransaction[]>> {
        const batchRaw = await this.loadFrom(this.nextFrom);
        if (batchRaw.length === 0) {
            return { done: true, value: [] };
        }

        const nextWouldBe = this.calculateNextFrom(batchRaw);
        let hasMore = false;
        if (typeof nextWouldBe !== "undefined") {
            this.nextFrom = nextWouldBe;
            hasMore = true;
        }

        const batch = batchRaw.map(op => this.opToTrx(op));

        return { done: !hasMore, value: batch };
    }

    private async loadFrom(from: number): Promise<AccountHistoryOperation[]> {
        // Sometimes at the end of account history "from" can be lower than 1000. In that case we should set
        // limit to "from". It will simply load operations including the oldest one.
        const batchLimit = from === -1 ? this.exclusiveBatchSize : Math.min(this.exclusiveBatchSize, from);

        const result = await this.loadBatchFromNewestToOldest(from, batchLimit);
        Log.log().debugGen(() => [
            "NonJoinedBatchFetch.loadFrom",
            {
                account: this.account,
                from,
                batchLimit,
                exclusiveBatchSize: this.exclusiveBatchSize,
                resultLength: result.length,
                range:
                    result.length > 0
                        ? [this.getIndexOfOp(result[0]), this.getIndexOfOp(result[result.length - 1])]
                        : [0, 0],
            },
        ]);

        return result;
    }

    private async loadBatchFromNewestToOldest(from: number, batchLimit: number): Promise<AccountHistoryOperation[]> {
        const batchFromOldestToNewest = await this.loadBatchFromServer(from, batchLimit);
        return batchFromOldestToNewest.reverse();
    }

    private async loadBatchFromServer(from: number, batchLimit: number): Promise<AccountHistoryOperation[]> {
        return await this.steemAdapter.getAccountHistoryAsync(this.account, from, batchLimit);
    }

    private calculateNextFrom(batch: AccountHistoryOperation[]): number | undefined {
        const accountHistoryDoesNotHaveMoreOperations = batch.length < this.exclusiveBatchSize;
        if (accountHistoryDoesNotHaveMoreOperations) {
            return undefined;
        }

        const oldestOp = batch[batch.length - 1];
        const oldestOpIndex = this.getIndexOfOp(oldestOp);
        const nextBatchWouldHaveIndex = oldestOpIndex - 1;
        const nextBatchFrom = nextBatchWouldHaveIndex < 0 ? undefined : nextBatchWouldHaveIndex;
        return nextBatchFrom;
    }

    private getIndexOfOp(op: AccountHistoryOperation) {
        return op[0];
    }

    private opToTrx(op: AccountHistoryOperation): UnifiedSteemTransaction {
        const opDescriptor = op[1];
        return {
            block_num: opDescriptor.block,
            transaction_num: opDescriptor.trx_in_block,
            transaction_id: opDescriptor.trx_id,
            // the following is UTC time (Z marks it so that it can be converted to local time properly)
            timestamp: SteemISODateParser.parse(opDescriptor.timestamp),
            ops: [opDescriptor.op],
        };
    }

    private inclusiveToExclusiveBatchSize(inclusiveBatchSize: number) {
        return inclusiveBatchSize - 1;
    }
}
