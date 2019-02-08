import * as _ from "lodash";
import * as steem from "steem";
import * as uuid from "uuid/v4";

import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";

export namespace mock {
    export function sampleOp(): steem.VoteOperationWithDescriptor {
        const id = uuid();
        return [
            "vote",
            {
                voter: `voter_${id}`,
                author: `author_${id}`,
                permlink: `permlink_${id}`,
                weight: 100,
            },
        ];
    }

    export function sampleTrx(
        blockNum: number,
        transactionNum: number,
        transactionId: string,
    ): UnifiedSteemTransaction {
        return {
            block_num: blockNum,
            transaction_num: transactionNum,
            transaction_id: transactionId,
            timestamp: new Date(),
            ops: [sampleOp()],
        };
    }

    export function generateSampleBatches(): UnifiedSteemTransaction[][] {
        const sampleBatches: UnifiedSteemTransaction[][] = _.reverse(
            _.range(0, 5).map(batchIndex =>
                _.reverse(
                    _.range(0, 10).map(trxIndex => sampleTrx(batchIndex, trxIndex, `trx_${batchIndex}.${trxIndex}`)),
                ),
            ),
        );
        return sampleBatches;
    }
}
