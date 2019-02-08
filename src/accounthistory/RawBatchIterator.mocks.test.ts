import { AccountHistoryOpsMock } from "./_test/AccountHistoryOpsMock.test";
import { RawBatchIterator } from "./RawBatchIterator";

export function prepare(params: {
    accountHistoryLength: number;
    batchSize: number;
    customOpsGenerator?: AccountHistoryOpsMock.OpsGenerator;
}) {
    const {
        adapter,
        account,
        fakeAccountHistoryOps,
        getAccountHistoryAsyncSpy,
    } = AccountHistoryOpsMock.mockSteemAdapterAccountHistory({
        accountHistoryLength: params.accountHistoryLength,
        customOpsGenerator: params.customOpsGenerator,
    });
    const batchFetch = new RawBatchIterator({
        steemAdapter: adapter,
        account,
        batchSize: params.batchSize,
    });

    return { account, adapter, fakeAccountHistoryOps, getAccountHistoryAsyncSpy, batchFetch, params };
}
