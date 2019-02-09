import ow from "ow";

import { BlockchainConfig } from "../blockchain/BlockchainConfig";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { UnifiedSteemTransaction } from "../blockchain/types/UnifiedSteemTransaction";
import { ChainableSupplier } from "../chainable/ChainableSupplier";
import { AsyncIterator } from "../iterator/AsyncIterator";
import { AsyncIteratorChainableSupplier } from "../iterator/AsyncIteratorChainableSupplier";

import { BatchToTrxIterator } from "./BatchToTrxIterator";
import { OverlappingBatchIterator } from "./OverlappingBatchIterator";
import { RawBatchIterator } from "./RawBatchIterator";

export class AccountHistorySupplierFactory {
    private steemAdapter: SteemAdapter;
    private account: string;
    private batchSize: number = BlockchainConfig.ACCOUNT_HISTORY_MAX_BATCH_SIZE;
    private batchOverlap: number = 5;

    public constructor(steemAdapter: SteemAdapter, account: string) {
        ow(steemAdapter, "steemAdapter", ow.object.is(o => SteemAdapter.isSteemAdapter(o)));
        this.steemAdapter = steemAdapter;

        ow(account, "account", ow.string.minLength(3));
        this.account = account;
    }

    public withOptions(options: { batchSize: number; batchOverlap: number }): AccountHistorySupplierFactory {
        return this.withBatchSize(options.batchSize).withBatchOverlap(options.batchOverlap);
    }

    public withBatchSize(batchSize: number): AccountHistorySupplierFactory {
        const minBatchSize = 1;
        const maxBatchSize = BlockchainConfig.ACCOUNT_HISTORY_MAX_BATCH_SIZE;
        ow(batchSize, "batchSize", ow.number.integer.inRange(minBatchSize, maxBatchSize));

        this.batchSize = batchSize;
        return this;
    }

    public withBatchOverlap(batchOverlap: number): AccountHistorySupplierFactory {
        ow(batchOverlap, "batchOverlap", ow.number.integer.greaterThan(0));
        this.batchOverlap = batchOverlap;
        return this;
    }

    public buildIterator(): AsyncIterator<UnifiedSteemTransaction | undefined> {
        const rawBatchIterator = new RawBatchIterator({
            steemAdapter: this.steemAdapter,
            account: this.account,
            batchSize: this.batchSize,
        });
        const overlappingIterator = new OverlappingBatchIterator(rawBatchIterator, this.batchOverlap);
        const batchToTrxIterator = new BatchToTrxIterator(overlappingIterator);
        return batchToTrxIterator;
    }

    public buildChainableSupplier(): ChainableSupplier<UnifiedSteemTransaction, any> {
        return new AsyncIteratorChainableSupplier<UnifiedSteemTransaction>(this.buildIterator());
    }
}
