import ow from "ow";

import { BlockchainConfig } from "../blockchain/BlockchainConfig";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { ChainableSupplier } from "../chainable/ChainableSupplier";
import { AsyncIteratorChainableSupplier } from "../iterator/AsyncIteratorChainableSupplier";

import { BatchToTrxIterator } from "./BatchToTrxIterator";
import { OverlappingBatchIterator } from "./OverlappingBatchIterator";
import { RawBatchIterator } from "./RawBatchIterator";

export namespace AccountHistorySupplierFactory {
    export function withOptions(
        account: string,
        steemAdapter: SteemAdapter,
        options?: Options,
    ): ChainableSupplier<UnifiedSteemTransaction, any> {
        ow(account, "account", ow.string.minLength(3));

        const optionsOrDefaults: Options = options || Options.DEFAULT_OPTIONS;
        Options.validate(optionsOrDefaults);

        const rawBatchIterator = new RawBatchIterator({
            steemAdapter,
            account,
            batchSize: optionsOrDefaults.batchSize,
        });
        const overlappingIterator = new OverlappingBatchIterator(rawBatchIterator, optionsOrDefaults.batchOverlap);
        const batchToTrxIterator = new BatchToTrxIterator(overlappingIterator);

        return new AsyncIteratorChainableSupplier<UnifiedSteemTransaction>(batchToTrxIterator);
    }

    export interface Options {
        batchSize: number;
        /**
         * Batch overlap limits maximal number of operations in single transaction
         */
        batchOverlap: number;
    }

    export namespace Options {
        export function validate(o: Options) {
            const minBatchSize = 1;
            const maxBatchSize = BlockchainConfig.ACCOUNT_HISTORY_MAX_BATCH_SIZE;
            ow(o.batchSize, "Options.batchSize", ow.number.integer.inRange(minBatchSize, maxBatchSize));

            ow(o.batchOverlap, "Options.batchOverlap", ow.number.integer.greaterThan(0));
        }

        export const DEFAULT_OPTIONS: Options = {
            batchSize: BlockchainConfig.ACCOUNT_HISTORY_MAX_BATCH_SIZE,
            batchOverlap: 5,
        };
    }
}
