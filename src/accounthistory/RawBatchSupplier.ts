import ow from "ow";
import * as steem from "steem";

import { ChainableSupplier } from "../chainable/Chainable";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { BlockchainConfig } from "../blockchain/BlockchainConfig";
import { Log } from "../Log";

export class RawBatchSupplier extends ChainableSupplier<steem.AccountHistory.Operation[], RawBatchSupplier> {
    private batchSize: number;
    private account: string;
    private steemAdapter: SteemAdapter;
    private onFinishCallback: ((error: Error | undefined) => void) | undefined = undefined;

    public constructor(props: { steemAdapter: SteemAdapter; account: string; batchSize: number }) {
        super();

        ow(props.steemAdapter, ow.object.is(o => SteemAdapter.isSteemAdapter(o)).label("steemAdapter"));
        this.steemAdapter = props.steemAdapter;

        ow(props.account, ow.string.minLength(3).label("account"));
        this.account = props.account;

        ow(
            props.batchSize,
            ow.number.integer.inRange(0, BlockchainConfig.ACCOUNT_HISTORY_MAX_BATCH_SIZE).label("batchSize")
        );
        this.batchSize = props.batchSize;
    }

    protected me(): RawBatchSupplier {
        return this;
    }

    public start(): Promise<void> {
        // this method should not be async. It returns the promise, not resolves it
        if (this.onFinishCallback) throw new Error("Cannot start the same suplier twice");

        return new Promise((resolve, reject) => {
            this.onFinishCallback = (error: Error | undefined) => {
                if (error) {
                    reject(error);
                    console.log("Reject start()");
                } else {
                    console.log(`resolve(error=${error})`);
                    resolve();
                }
            };
            this.loadFromOnlyIfConsumers(-1);

            console.log(`RawBashSupplier.onFinishCallback=${this.onFinishCallback}`);
        });
    }

    private loadFromOnlyIfConsumers(from: number): void {
        console.log("RawBatchSupplier.loadFromOnlyIfConsumers");
        if (this.shouldLoadNewItems()) {
            this.loadFrom(from);
        } else this.finished();
    }

    private async loadFrom(from: number) {
        try {
            // Sometimes at the end of account history "from" can be lower than 1000. In that case we should set limit to "from". It will simply load operations including the oldest one.
            const batchLimit = from === -1 ? this.batchSize : Math.min(this.batchSize, from);

            Log.log().debug(
                "STEEMJSACCOUNTHISTORYSUPPLIER_GET_ACCOUNT_HISTORY_ASYNC=" +
                    JSON.stringify({ account: this.account, from: from, batchLimit: batchLimit })
            );

            await this.loadAndGive(from, batchLimit);
        } catch (error) {
            this.errorEncountered(error);
        }
    }

    private async loadAndGive(from: number, batchLimit: number) {
        const batch = await this.loadBatchFromNewestToOldest(from, batchLimit);

        if (batch.length == 0) {
            this.finished();
        } else {
            const takerWantsMore = this.give(undefined, batch);
            const accountHistoryDoesNotHaveMoreOperations = batch.length < this.batchSize;
            if (accountHistoryDoesNotHaveMoreOperations) return this.finished();
            else {
                if (takerWantsMore) {
                    const oldestOp = batch[batch.length - 1];
                    const oldestOpIndex = this.getIndexOfOp(oldestOp);
                    const nextBatchFrom = oldestOpIndex - 1;
                    this.loadFromOnlyIfConsumers(nextBatchFrom);
                } else {
                    this.finished();
                }
            }
        }
    }

    private async loadBatchFromNewestToOldest(
        from: number,
        batchLimit: number
    ): Promise<steem.AccountHistory.Operation[]> {
        const batchFromOldestToNewest = await this.loadBatchFromServer(from, batchLimit);
        return batchFromOldestToNewest.reverse();
    }

    private async loadBatchFromServer(from: number, batchLimit: number): Promise<steem.AccountHistory.Operation[]> {
        return await this.steemAdapter.getAccountHistoryAsync(this.account, from, batchLimit);
    }

    private finished(error?: Error) {
        console.log(`RawBatchSupplier.finished(${error})`);
        if (this.onFinishCallback) {
            console.log(`RawBatchSupplier.onFinishCallback(${error})`);
            this.onFinishCallback(error);
        } else console.log(`RawBatchSupplier.onFinishCallback IS EMPTY (${this.onFinishCallback})`);
    }

    private errorEncountered(error: Error) {
        const continueOnThisError = this.give(error, undefined);
        if (!continueOnThisError) this.finished(error);
    }

    private getIndexOfOp(op: steem.AccountHistory.Operation) {
        return op[0];
    }
}
