import ow from "ow";

import { ChainableSupplier } from "../chainable/Chainable";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { BlockchainConfig } from "../blockchain/BlockchainConfig";
import { AccountHistorySupplierImpl } from "./AccountHistorySupplierImpl";
import { SteemAdapter } from "../blockchain/SteemAdapter";

export namespace AccountHistorySupplierFactory {
    export function withOptions(
        account: string,
        steemAdapter: SteemAdapter,
        options?: Options
    ): ChainableSupplier<UnifiedSteemTransaction, any> {
        ow(account, ow.string.minLength(3).label("account"));

        const options_: Options = options || Options.DEFAULT_OPTIONS;
        Options.validate(options_);

        return new AccountHistorySupplierImpl(steemAdapter, {
            account: account,
            batchSize: options_.batchSize,
            batchOverlap: options_.batchOverlap,
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
