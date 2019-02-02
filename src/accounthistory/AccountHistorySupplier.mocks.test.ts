import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { SimpleTaker } from "../chainable/SimpleTaker";

import { AccountHistoryOpsMock } from "./_test/AccountHistoryOpsMock.test";
import { AccountHistorySupplierImpl } from "./AccountHistorySupplierImpl";

export function prepare(params: {
    accountHistoryLength: number;
    batchSize: number;
    batchOverlap: number;
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
    const supplier = new AccountHistorySupplierImpl(adapter, {
        account,
        batchSize: params.batchSize,
        batchOverlap: params.batchOverlap,
    });

    return { account, adapter, fakeAccountHistoryOps, getAccountHistoryAsyncSpy, supplier, params };
}

export async function takeTransactionsFromSupplier(
    supplier: AccountHistorySupplierImpl,
    takeCount: number = -1,
): Promise<UnifiedSteemTransaction[]> {
    const takenTransactions: UnifiedSteemTransaction[] = [];
    supplier.chain(
        new SimpleTaker<UnifiedSteemTransaction>(trx => {
            takenTransactions.push(trx);
            const takeNext = takeCount > 0 ? takenTransactions.length < takeCount : true;
            return takeNext;
        }),
    );
    await supplier.start();
    return takenTransactions;
}
