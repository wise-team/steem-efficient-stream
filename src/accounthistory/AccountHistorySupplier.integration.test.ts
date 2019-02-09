import { expect, use as chaiUse } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as _ from "lodash";
import "mocha";

import { testsConfig } from "../_test/tests-config.test";
import { SteemAdapterFactory } from "../blockchain/SteemAdapterFactory";
import { UnifiedSteemTransaction } from "../blockchain/types/UnifiedSteemTransaction";
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

describe("AccountHistorySupplier", function() {
    this.timeout(60000);
    this.retries(1);

    it("supplies whole account history from the newest to the oldest op", async () => {
        const account = "jblew";
        const steemAdapter = SteemAdapterFactory.withOptions({ url: testsConfig.defaultSteemApi });
        const supplier = new AccountHistorySupplierFactory(steemAdapter, account)
            .withBatchSize(300)
            .buildChainableSupplier();

        const trxs = await takeTransactionsFromSupplier(supplier);
        expect(trxs)
            .to.be.an("array")
            .with.length.greaterThan(500);

        let prevDate: Date = new Date(Date.now() + 3000);
        for (const trx of trxs) {
            expect(trx.timestamp.getTime() < prevDate.getTime());
            prevDate = trx.timestamp;
        }

        const lastTransaction = _.last(trxs) || { ops: [{}] };
        const lastTransactionFirstOp: any = lastTransaction.ops[0];
        expect(lastTransactionFirstOp[0], "last transaction descriptor").to.be.equal("account_create");
        expect(lastTransactionFirstOp[1], "last transaction operation")
            .to.haveOwnProperty("new_account_name")
            .that.is.equal(account);
    });

    it("timestamps are parsed as valid", async () => {
        const account = "jblew";
        const steemAdapter = SteemAdapterFactory.withOptions({ url: testsConfig.defaultSteemApi });
        const iterator = new AccountHistorySupplierFactory(steemAdapter, account).withBatchSize(10).buildIterator();

        const { value } = await iterator.next();
        const newestTrx = value;
        expect(newestTrx.timestamp).to.be.instanceOf(Date);
        const timestamp = newestTrx.timestamp.getTime();
        expect(Number.isInteger(timestamp)).to.be.equal(true);
        expect(Number.isFinite(timestamp)).to.be.equal(true);
        expect(timestamp > 0).to.be.equal(true);
    });
});
