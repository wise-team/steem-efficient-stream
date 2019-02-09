import * as _ from "lodash";
import * as sinon from "sinon";
import * as uuid from "uuid/v4";

import { SteemAdapter } from "../../blockchain/SteemAdapter";
import { SteemAdapterFactory } from "../../blockchain/SteemAdapterFactory";
import { AccountHistoryOperation } from "../../blockchain/types/AccountHistoryOperation";
import { OperationWithDescriptor } from "../../blockchain/types/OperationWithDescriptor";
import { UnifiedSteemTransaction } from "../../blockchain/types/UnifiedSteemTransaction";
import { VoteOperation } from "../../blockchain/types/VoteOperation";

export namespace AccountHistoryOpsMock {
    export type OpsGenerator = (account: string, length: number) => AccountHistoryOperation[];

    export function generateFakeAccountHistoryOps(account: string, length: number): AccountHistoryOperation[] {
        const ops = _.range(0, length).map(index => {
            const op: VoteOperation.WithDescriptor = [
                "vote",
                {
                    voter: account,
                    author: "author-" + index,
                    permlink: "permlink-" + index,
                    weight: -10000 + 20000 * Math.random(),
                },
            ];
            const accHistop: AccountHistoryOperation = [
                index,
                {
                    block: Math.floor(index / 2),
                    op,
                    op_in_trx: 0,
                    timestamp: new Date(Date.now() - 10000 + index).toISOString(),
                    trx_id: uuid() + "_trx_" + index,
                    trx_in_block: index % 2,
                    virtual_op: 0,
                },
            ];
            return accHistop;
        });
        return ops;
    }

    export function getAccountHistoryAsyncMock(fakeAccountHistoryOps: AccountHistoryOperation[]) {
        const mockedFn: (account: string, from: number, limit: number) => Promise<AccountHistoryOperation[]> = async (
            account: string,
            from: number,
            limit: number,
        ) => {
            if (from < 0) {
                from = fakeAccountHistoryOps.length - 1;
            }
            const sliceStart = Math.max(from - limit, 0);
            const sliceEndExcluding = sliceStart + limit + 1;
            const result = fakeAccountHistoryOps.slice(sliceStart, sliceEndExcluding);

            return result;
        };
        return mockedFn;
    }

    export function mockSteemAdapterAccountHistory(params: {
        accountHistoryLength: number;
        customOpsGenerator?: OpsGenerator;
    }) {
        const account = _.sample(["noisy", "jblew", "fervi"]) || "-sample-returned-undefined-";
        const adapter: SteemAdapter = SteemAdapterFactory.mock();

        const opsGenerator: OpsGenerator = params.customOpsGenerator || generateFakeAccountHistoryOps;
        const fakeAccountHistoryOps = opsGenerator(account, params.accountHistoryLength);

        const getAccountHistoryAsyncSpy = sinon.spy(getAccountHistoryAsyncMock(fakeAccountHistoryOps));
        adapter.getAccountHistoryAsync = getAccountHistoryAsyncSpy;

        return { account, adapter, fakeAccountHistoryOps, getAccountHistoryAsyncSpy };
    }

    export function generateSampleMultipleTransactions(
        opsInTrx: number,
        account: string,
        numOfTransactions: number,
    ): UnifiedSteemTransaction[] {
        const transactions: UnifiedSteemTransaction[] = _.range(0, numOfTransactions).map(groupIndex => {
            const ops: OperationWithDescriptor[] = _.range(0, opsInTrx).map(opIndex => {
                const opId = `_${opIndex}`;
                const op: VoteOperation = {
                    voter: account,
                    author: `a${opId}`,
                    permlink: `v${opId}`,
                    weight: 100,
                };
                const opWithDesc: VoteOperation.WithDescriptor = ["vote", op];
                return opWithDesc;
            });
            const trx: UnifiedSteemTransaction = {
                block_num: groupIndex,
                transaction_num: 0,
                transaction_id: `${uuid()}_trx_${groupIndex}`,
                timestamp: new Date(),
                ops,
            };
            return trx;
        });
        return transactions;
    }
}
