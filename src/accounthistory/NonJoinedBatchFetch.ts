import ow from "ow";
import * as steem from "steem";

import { BlockchainConfig } from "../blockchain/BlockchainConfig";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { Log } from "../Log";

export class NonJoinedBatchFetch {
    private exclusiveBatchSize: number;
    private account: string;
    private steemAdapter: SteemAdapter;
    private nextFrom: number = -1;

    public constructor(props: { steemAdapter: SteemAdapter; account: string; batchSize: number }) {
        ow(props.steemAdapter, ow.object.is(o => SteemAdapter.isSteemAdapter(o)).label("steemAdapter"));
        this.steemAdapter = props.steemAdapter;

        ow(props.account, ow.string.minLength(3).label("account"));
        this.account = props.account;

        ow(
            props.batchSize,
            ow.number.integer.inRange(0, BlockchainConfig.ACCOUNT_HISTORY_MAX_BATCH_SIZE).label("batchSize"),
        );
        const inclusiveBatchSize = props.batchSize;
        this.exclusiveBatchSize = this.inclusiveToExclusiveBatchSize(inclusiveBatchSize);
    }

    public async getNextBatch(): Promise<UnifiedSteemTransaction[] | undefined> {
        if (this.nextFrom === 0) {
            return undefined;
        }

        const batchRaw = await this.loadFrom(this.nextFrom);
        this.nextFrom = this.calculateNextFrom(batchRaw);

        const batch = batchRaw.map(op => this.opToTrx(op));

        if (batch.length > 0) {
            return batch;
        } else {
            return undefined;
        }
    }

    private async loadFrom(from: number): Promise<steem.AccountHistory.Operation[]> {
        // Sometimes at the end of account history "from" can be lower than 1000. In that case we should set
        // limit to "from". It will simply load operations including the oldest one.
        const batchLimit = from === -1 ? this.exclusiveBatchSize : Math.min(this.exclusiveBatchSize, from);

        const result = await this.loadBatchFromNewestToOldest(from, batchLimit);
        Log.log().debug("NonJoinedBatchFetch.loadFrom", {
            account: this.account,
            from,
            batchLimit,
            exclusiveBatchSize: this.exclusiveBatchSize,
            resultLength: result.length,
            nextFrom: this.nextFrom,
            range: [this.getIndexOfOp(result[0]), this.getIndexOfOp(result[result.length - 1])],
        });

        return result;
    }

    private async loadBatchFromNewestToOldest(
        from: number,
        batchLimit: number,
    ): Promise<steem.AccountHistory.Operation[]> {
        const batchFromOldestToNewest = await this.loadBatchFromServer(from, batchLimit);
        return batchFromOldestToNewest.reverse();
    }

    private async loadBatchFromServer(from: number, batchLimit: number): Promise<steem.AccountHistory.Operation[]> {
        return await this.steemAdapter.getAccountHistoryAsync(this.account, from, batchLimit);
    }

    private calculateNextFrom(batch: steem.AccountHistory.Operation[]): number {
        const accountHistoryDoesNotHaveMoreOperations = batch.length < this.exclusiveBatchSize;
        if (accountHistoryDoesNotHaveMoreOperations) {
            return 0;
        }

        const oldestOp = batch[batch.length - 1];
        const oldestOpIndex = this.getIndexOfOp(oldestOp);
        const nextBatchFrom = Math.max(oldestOpIndex - 1, 0);
        return nextBatchFrom;
    }

    private getIndexOfOp(op: steem.AccountHistory.Operation) {
        return op[0];
    }

    private opToTrx(op: steem.AccountHistory.Operation): UnifiedSteemTransaction {
        const opDescriptor = op[1];
        return {
            block_num: opDescriptor.block,
            transaction_num: opDescriptor.trx_in_block,
            transaction_id: opDescriptor.trx_id,
            // the following is UTC time (Z marks it so that it can be converted to local time properly)
            timestamp: new Date(opDescriptor.timestamp + "Z"),
            ops: [opDescriptor.op],
        };
    }

    private inclusiveToExclusiveBatchSize(inclusiveBatchSize: number) {
        return inclusiveBatchSize - 1;
    }
}
