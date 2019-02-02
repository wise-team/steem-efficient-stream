import * as _ from "lodash";
import ow from "ow";

import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { OverlapTrxJoiningBatchBuffer } from "./OverlapTrxJoiningBatchBuffer";
import { NonJoinedBatchFetch } from "./NonJoinedBatchFetch";
import { ChainableSupplier } from "../chainable/Chainable";

export class AccountHistorySupplierImpl extends ChainableSupplier<UnifiedSteemTransaction, AccountHistorySupplierImpl> {
    private batchBuffer: OverlapTrxJoiningBatchBuffer;
    private currentBatch: UnifiedSteemTransaction[] | undefined = [];

    constructor(steemAdapter: SteemAdapter, props: { account: string; batchSize: number; batchOverlap: number }) {
        super();

        ow(steemAdapter, ow.object.is(o => SteemAdapter.isSteemAdapter(o)).label("steemAdapter"));

        const account = props.account;
        ow(account, ow.string.minLength(3).label("account"));

        const batchSize = props.batchSize;
        ow(batchSize, ow.number.integer.finite.label("batchSize"));

        const batchOverlap = props.batchOverlap;
        ow(
            batchOverlap,
            ow.number.integer
                .greaterThan(0)
                .lessThan(batchSize - 1)
                .finite.label("batchOverlap")
        );

        const batchFetch = new NonJoinedBatchFetch({ steemAdapter, account, batchSize });
        this.batchBuffer = new OverlapTrxJoiningBatchBuffer(batchFetch, batchOverlap);
    }

    public async start(): Promise<void> {
        let takerWantsMore = true;
        while (takerWantsMore) {
            const giveResult = await this.giveNextTransactionToTaker();
            takerWantsMore = giveResult.takerWantsMore;
        }
    }

    private async giveNextTransactionToTaker(): Promise<{ takerWantsMore: boolean }> {
        try {
            const trx = await this.nextTransaction();
            const takerWantsMore = this.give(undefined, trx);
            return { takerWantsMore };
        } catch (error) {
            const takerWantsMore = this.give(error, undefined);
            if (!takerWantsMore) throw error;
            return { takerWantsMore };
        }
    }

    private async nextTransaction(): Promise<UnifiedSteemTransaction | undefined> {
        this.loadNextBatchIfRequired();

        if (!this.currentBatch) return undefined;
        return this.currentBatch.shift();
    }

    private async loadNextBatchIfRequired() {
        if (this.currentBatch && this.currentBatch.length === 0) {
            this.currentBatch = await this.batchBuffer.nextBatch();
        }
    }

    protected me(): AccountHistorySupplierImpl {
        return this;
    }
}
