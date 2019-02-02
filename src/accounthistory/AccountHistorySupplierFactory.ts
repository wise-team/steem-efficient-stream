import ow from "ow";

import { BlockchainConfig } from "../blockchain/BlockchainConfig";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { ChainableSupplier } from "../chainable/ChainableSupplier";

import { AccountHistorySupplierImpl } from "./AccountHistorySupplierImpl";

export namespace AccountHistorySupplierFactory {
    export function withOptions(
        account: string,
        steemAdapter: SteemAdapter,
        options?: Options,
    ): ChainableSupplier<UnifiedSteemTransaction, any> {
        ow(account, ow.string.minLength(3).label("account"));

        const optionsOrDefaults: Options = options || Options.DEFAULT_OPTIONS;
        Options.validate(optionsOrDefaults);

        return new AccountHistorySupplierImpl(steemAdapter, {
            account,
            batchSize: optionsOrDefaults.batchSize,
            batchOverlap: optionsOrDefaults.batchOverlap,
        });
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
            ow(o.batchSize, ow.number.integer.inRange(minBatchSize, maxBatchSize).label("Options.batchSize"));

            ow(o.batchOverlap, ow.number.integer.greaterThan(0).label("Options.batchOverlap"));
        }

        export const DEFAULT_OPTIONS: Options = {
            batchSize: BlockchainConfig.ACCOUNT_HISTORY_MAX_BATCH_SIZE,
            batchOverlap: 5,
        };
    }
}
