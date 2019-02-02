import ow from "ow";
import * as steem from "steem";
import { ChainableTransformer } from "../chainable/Chainable";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";

export class NonJoiningOpToTrxBatchTransformer extends ChainableTransformer<
    steem.AccountHistory.Operation[],
    UnifiedSteemTransaction[],
    NonJoiningOpToTrxBatchTransformer
> {
    protected me(): NonJoiningOpToTrxBatchTransformer {
        return this;
    }

    protected take(error: Error | undefined, takenBatch: steem.AccountHistory.Operation[]): boolean {
        if (error) throw error;

        console.log(`NonJoiningOpToTrxBatchTransformer.take([${takenBatch.length}])`);

        const takenBatchNonJoinedTrxs = takenBatch.map(op => this.opToTrx(op));
        return this.give(undefined, takenBatchNonJoinedTrxs);
    }

    private opToTrx(op: steem.AccountHistory.Operation): UnifiedSteemTransaction {
        const opDescriptor = op[1];
        return {
            block_num: opDescriptor.block,
            transaction_num: opDescriptor.trx_in_block,
            transaction_id: opDescriptor.trx_id,
            timestamp: new Date(opDescriptor.timestamp + "Z"), // this is UTC time (Z marks it so that it can be converted to local time properly)
            ops: [opDescriptor.op],
        };
    }
}
