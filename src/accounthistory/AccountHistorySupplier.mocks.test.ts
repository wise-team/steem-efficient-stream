import * as _ from "lodash";

import { AccountHistoryOperation } from "../blockchain/types/AccountHistoryOperation";
import { UnifiedSteemTransaction } from "../blockchain/types/UnifiedSteemTransaction";
import { ChainableSupplier } from "../chainable/ChainableSupplier";
import { SimpleTaker } from "../chainable/SimpleTaker";

import { AccountHistoryOpsMock } from "./_test/AccountHistoryOpsMock.test";
import { AccountHistorySupplierFactory } from "./AccountHistorySupplierFactory";

export namespace mock {
    export function splitTransactionsIntoOperationsAccountHistoryGenerator(
        transactions: UnifiedSteemTransaction[],
    ): AccountHistoryOpsMock.OpsGenerator {
        return (account: string, historyLength: number): AccountHistoryOperation[] => {
            let accountHistoryCounter = 0;
            const operationGroups: AccountHistoryOperation[][] = transactions.map(trx => {
                const trxSplitIntoOps: AccountHistoryOperation[] = trx.ops.map(op => {
                    const opIndex = accountHistoryCounter++;
                    const acHistOp: AccountHistoryOperation = [
                        opIndex,
                        {
                            block: trx.block_num,
                            trx_in_block: trx.transaction_num,
                            trx_id: trx.transaction_id,
                            op_in_trx: 0,
                            timestamp: trx.timestamp.toISOString(),
                            virtual_op: 0,
                            op,
                        },
                    ];
                    return acHistOp;
                });
                return trxSplitIntoOps;
            });
            return _.flatten(operationGroups);
        };
    }

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
        const supplier = new AccountHistorySupplierFactory(adapter, account)
            .withOptions({
                batchSize: params.batchSize,
                batchOverlap: params.batchOverlap,
            })
            .buildChainableSupplier();

        return { account, adapter, fakeAccountHistoryOps, getAccountHistoryAsyncSpy, supplier, params };
    }

    export async function takeTransactionsFromSupplier(
        supplier: ChainableSupplier<UnifiedSteemTransaction, any>,
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
}
