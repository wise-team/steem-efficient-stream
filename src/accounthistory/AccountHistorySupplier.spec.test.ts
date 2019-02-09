import { expect, use as chaiUse } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as _ from "lodash";
import "mocha";
import * as sinon from "sinon";

import { Log } from "../Log";

import { AccountHistoryOpsMock } from "./_test/AccountHistoryOpsMock.test";
import { mock } from "./AccountHistorySupplier.mocks.test";
Log.log().initialize();

chaiUse(chaiAsPromised);

describe("AccountHistorySupplier", function() {
    it("queries only once if batch returns lower number of operations than limit", async () => {
        const { supplier, getAccountHistoryAsyncSpy } = mock.prepare({
            accountHistoryLength: _.random(0, 999),
            batchOverlap: 5,
            batchSize: 1000,
        });

        await mock.takeTransactionsFromSupplier(supplier);

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(1);
    });

    it("queries with correct batchSize", async () => {
        const batchSize = Math.floor(Math.random() * 1000);
        const { account, supplier, getAccountHistoryAsyncSpy } = mock.prepare({
            accountHistoryLength: _.random(0, batchSize),
            batchSize,
            batchOverlap: 5,
        });

        await mock.takeTransactionsFromSupplier(supplier);

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(1);
        const realBatchSize = batchSize - 1;
        expect(getAccountHistoryAsyncSpy.firstCall.args).to.deep.equal([account, -1, realBatchSize]);
    });

    it("query batches does not overlap", async () => {
        const batchSize = Math.floor(Math.random() * 1000);
        const numBatches = _.random(5, 10);
        const { supplier, getAccountHistoryAsyncSpy, fakeAccountHistoryOps } = mock.prepare({
            accountHistoryLength: batchSize * numBatches,
            batchOverlap: 5,
            batchSize,
        });

        await mock.takeTransactionsFromSupplier(supplier);

        let sum = 0;
        for (const call of getAccountHistoryAsyncSpy.getCalls()) {
            sum += (await call.returnValue).length;
        }
        expect(sum).to.be.equal(fakeAccountHistoryOps.length);
        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(numBatches);
    });

    it("supplies all transactions of account history", async () => {
        const { supplier, getAccountHistoryAsyncSpy, fakeAccountHistoryOps } = mock.prepare({
            accountHistoryLength: _.random(60, 110),
            batchOverlap: 3,
            batchSize: 10,
        });

        const takenTransactions = await mock.takeTransactionsFromSupplier(supplier);

        const suppliedTrxIds = _.reverse(fakeAccountHistoryOps.map(op => op[1].trx_id));
        const takenTrxIds = takenTransactions.map(trx => trx.transaction_id);

        expect(getAccountHistoryAsyncSpy.callCount).to.be.greaterThan(1);
        expect(takenTrxIds).to.have.members(suppliedTrxIds);
    });

    [{ desc: "single batch", batches: 1 }, { desc: "multiple batches", batches: _.random(5, 10) }].forEach(test =>
        it(
            "supplies transactions from " + test.desc + " in a correct order: from the newest to the oldest",
            async () => {
                const { supplier, getAccountHistoryAsyncSpy } = mock.prepare({
                    accountHistoryLength: 1000 * test.batches - 1,
                    batchOverlap: 5,
                    batchSize: 1000,
                });

                const takenTransactions = await mock.takeTransactionsFromSupplier(supplier);

                expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(test.batches);

                let prevTrxMoment = Number.MAX_VALUE;
                for (const takenTrx of takenTransactions) {
                    const trxMoment = Number.parseFloat(takenTrx.block_num + "." + takenTrx.transaction_num);
                    expect(trxMoment).to.be.lessThan(prevTrxMoment);
                    prevTrxMoment = trxMoment;
                }
            },
        ),
    );

    it("stops supplying after takeFn returns false", async () => {
        const { supplier } = mock.prepare({
            accountHistoryLength: 50,
            batchOverlap: 5,
            batchSize: 10,
        });

        const takeCount = 15;
        const takenTransactions = await mock.takeTransactionsFromSupplier(supplier, takeCount);

        expect(takenTransactions.length).to.be.equal(takeCount);
    });

    it("stops querying after takeFn returns false", async () => {
        const { supplier, getAccountHistoryAsyncSpy } = mock.prepare({
            accountHistoryLength: 50,
            batchOverlap: 5,
            batchSize: 10,
        });

        const takeCount = 15;
        await mock.takeTransactionsFromSupplier(supplier, takeCount);

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(2);
    });

    it("stops querying after error is caught", async () => {
        const { supplier, adapter } = mock.prepare({ accountHistoryLength: 50, batchOverlap: 5, batchSize: 10 });

        const getAccountHistoryAsyncSpy = sinon.fake.rejects(new Error("Test error"));
        adapter.getAccountHistoryAsync = getAccountHistoryAsyncSpy;

        try {
            await mock.takeTransactionsFromSupplier(supplier);
        } catch (error) {
            // expected
        }

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(1);
    });

    it("rejects after error is caught", async () => {
        const { supplier, adapter } = mock.prepare({ accountHistoryLength: 50, batchOverlap: 5, batchSize: 10 });

        const getAccountHistoryAsyncSpy = sinon.fake.rejects(new Error("Test error"));
        adapter.getAccountHistoryAsync = getAccountHistoryAsyncSpy;

        try {
            await mock.takeTransactionsFromSupplier(supplier);
            throw new Error("Should throw");
        } catch (error) {
            expect(error)
                .to.be.instanceOf(Error)
                .that.haveOwnProperty("message")
                .that.is.equal("Test error");
        }
    });

    [2, 3, 4, 5].forEach(opsInTrx => {
        it(`joins operations that are in separate batches, ${opsInTrx} operations per transaction`, async () => {
            const batchSize = 83;
            const numOfTransactions = Math.floor(batchSize * 4.5);
            const batchOverlap = 8;
            const sampleTransactions = AccountHistoryOpsMock.generateSampleMultipleTransactions(
                opsInTrx,
                "noisy",
                numOfTransactions,
            );
            const accountHistoryLength = opsInTrx * numOfTransactions;
            const { supplier, fakeAccountHistoryOps } = mock.prepare({
                accountHistoryLength,
                batchOverlap,
                batchSize,
                customOpsGenerator: mock.splitTransactionsIntoOperationsAccountHistoryGenerator(sampleTransactions),
            });

            const takenTrxs = await mock.takeTransactionsFromSupplier(supplier);

            expect(takenTrxs)
                .to.be.an("array")
                .with.length(numOfTransactions);

            const sampleTransactionsFromNewest = _.reverse(_.cloneDeep(sampleTransactions)).map(trx => {
                return { ...trx, ops: trx.ops };
            });

            expect(takenTrxs).to.deep.equal(sampleTransactionsFromNewest);
            expect(takenTrxs).to.deep.equal(sampleTransactionsFromNewest);
        });
    });
});
