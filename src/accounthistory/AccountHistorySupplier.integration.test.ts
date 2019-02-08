import { expect, use as chaiUse } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as _ from "lodash";
import "mocha";

import { testsConfig } from "../_test/tests-config.test";
import { SteemAdapterFactory } from "../blockchain/SteemAdapterFactory";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { ChainableSupplier } from "../chainable/ChainableSupplier";
import { SimpleTaker } from "../chainable/SimpleTaker";
import { Log } from "../Log";

import { AccountHistorySupplierFactory } from "./AccountHistorySupplierFactory";
Log.log().initialize();

chaiUse(chaiAsPromised);

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

describe.only("AccountHistorySupplier", function() {
    this.timeout(60000);
    this.retries(1);

    it("supplies whole account history from the newest to the oldest op", async () => {
        const supplier = AccountHistorySupplierFactory.withOptions(
            "jblew",
            SteemAdapterFactory.withOptions({ url: testsConfig.defaultSteemApi }),
        );

        const trxs = await takeTransactionsFromSupplier(supplier);
        expect(trxs)
            .to.be.an("array")
            .with.length.greaterThan(1000);

        let prevDate: Date = new Date(Date.now() + 3000);
        for (const trx of trxs) {
            expect(trx.timestamp.getTime() < prevDate.getTime());
            prevDate = trx.timestamp;
        }
    });
});
