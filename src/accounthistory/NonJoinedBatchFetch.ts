import ow from "ow";
import * as steem from "steem";

import { BlockchainConfig } from "../blockchain/BlockchainConfig";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { Log } from "../Log";

export class NonJoinedBatchFetch {
    private batchSize: number;
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
        this.batchSize = props.batchSize;
    }

    public async getNextBatch(): Promise<UnifiedSteemTransaction[] | undefined> {
        if (this.nextFrom === 0) {
            return undefined;
        }

        const batchRaw = await this.loadFrom(this.nextFrom);
        this.nextFrom = this.calculateNextFrom(batchRaw);

        const batch = batchRaw.map(op => this.opToTrx(op));

        return batch;
    }

    private async loadFrom(from: number): Promise<steem.AccountHistory.Operation[]> {
        // Sometimes at the end of account history "from" can be lower than 1000. In that case we should set
        // limit to "from". It will simply load operations including the oldest one.
        const batchLimit = from === -1 ? this.batchSize : Math.min(this.batchSize, from);

        Log.log().debug(
            "STEEMJSACCOUNTHISTORYSUPPLIER_GET_ACCOUNT_HISTORY_ASYNC=" +
                JSON.stringify({ account: this.account, from, batchLimit }),
        );

        return await this.loadBatchFromNewestToOldest(from, batchLimit);
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
        const accountHistoryDoesNotHaveMoreOperations = batch.length < this.batchSize;
        if (accountHistoryDoesNotHaveMoreOperations) {
            return 0;
        }

        const oldestOp = batch[batch.length - 1];
        const oldestOpIndex = this.getIndexOfOp(oldestOp);
        const nextBatchFrom = oldestOpIndex - 1;
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
}
