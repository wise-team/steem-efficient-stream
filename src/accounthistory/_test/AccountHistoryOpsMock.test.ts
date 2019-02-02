import * as _ from "lodash";
import * as sinon from "sinon";
import * as steem from "steem";
import * as uuid from "uuid/v4";

import { SteemAdapter } from "../../blockchain/SteemAdapter";
import { SteemAdapterFactory } from "../../blockchain/SteemAdapterFactory";

export namespace AccountHistoryOpsMock {
    export type OpsGenerator = (account: string, length: number) => steem.AccountHistory.Operation[];

    export function generateFakeAccountHistoryOps(account: string, length: number): steem.AccountHistory.Operation[] {
        const ops = _.range(0, length).map(index => {
            const op: steem.VoteOperationWithDescriptor = [
                "vote",
                {
                    voter: account,
                    author: "author-" + index,
                    permlink: "permlink-" + index,
                    weight: -10000 + 20000 * Math.random(),
                },
            ];
            const accHistop: steem.AccountHistory.Operation = [
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

    export function getAccountHistoryAsyncMock(fakeAccountHistoryOps: steem.AccountHistory.Operation[]) {
        const mockedFn: (
            account: string,
            from: number,
            limit: number,
        ) => Promise<steem.AccountHistory.Operation[]> = async (account: string, from: number, limit: number) => {
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
}
