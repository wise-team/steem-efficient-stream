import { expect, use as chaiUse } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as _ from "lodash";
import "mocha";
import * as sinon from "sinon";

import { SteemAdapterFactory } from "../blockchain/SteemAdapterFactory";
import { Log } from "../Log";

import { NonJoinedBatchFetch } from "./NonJoinedBatchFetch";
import { prepare } from "./NonJoinedBatchFetch.mocks.test";

Log.log().initialize();
chaiUse(chaiAsPromised);

describe("NonJoinedBatchFetch", function() {
    const defaultProps = {
        accountHistoryLength: _.random(100, 1000),
        batchSize: _.random(10, 50),
    };

    it("rejects with error thrown by SteemAdapter", async () => {
        const steemAdapter = SteemAdapterFactory.mock();
        steemAdapter.getAccountHistoryAsync = sinon.fake.rejects(new Error("Test error"));
        const batchFetch = new NonJoinedBatchFetch({ steemAdapter, batchSize: 100, account: "doesnt matter" });

        try {
            await batchFetch.getNextBatch();
            expect.fail("Should throw");
        } catch (error) {
            expect(error)
                .to.haveOwnProperty("message")
                .that.is.equal("Test error");
        }
    });

    it("returns whole batch", async () => {
        const { batchFetch } = prepare(defaultProps);

        const batch = (await batchFetch.getNextBatch()) || [];
        expect(batch.length).to.be.equal(defaultProps.batchSize);
    });

    it("queries only once if batch returns lower number of operations than limit", async () => {
        const { batchFetch, getAccountHistoryAsyncSpy } = prepare({
            accountHistoryLength: _.random(0, 999),
            batchSize: 1000,
        });

        await batchFetch.getNextBatch();

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(1);
    });

    it("queries with correct batchSize", async () => {
        const batchSize = _.random(10, 1000);
        const { batchFetch, getAccountHistoryAsyncSpy, account } = prepare({
            accountHistoryLength: _.random(0, 999),
            batchSize,
        });

        await batchFetch.getNextBatch();

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(1);
        const realBatchSize = batchSize - 1;
        expect(getAccountHistoryAsyncSpy.firstCall.args).to.deep.equal([account, -1, realBatchSize]);
    });

    it("query batches does not overlap", async () => {
        const batchSize = _.random(50, 60);
        const numBatches = _.random(5, 10);
        const { account, batchFetch, getAccountHistoryAsyncSpy, fakeAccountHistoryOps } = prepare({
            accountHistoryLength: batchSize * (numBatches - 1) + _.random(1, 5),
            batchSize,
        });

        let finished = false;
        while (!finished) {
            finished = !(await batchFetch.getNextBatch());
        }

        let sum = 0;
        for (const call of getAccountHistoryAsyncSpy.getCalls()) {
            sum += (await call.returnValue).length;
        }
        expect(sum).to.be.equal(fakeAccountHistoryOps.length);
        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(numBatches);
    });

    it("does not loop endlessly when accountHistoryLength is a multiplication of batchSize", async () => {
        const batchSize = Math.floor(Math.random() * 1000);
        const numBatches = _.random(5, 10);
        const { account, batchFetch, getAccountHistoryAsyncSpy, fakeAccountHistoryOps } = prepare({
            accountHistoryLength: batchSize * numBatches,
            batchSize,
        });

        let finished = false;
        while (!finished) {
            finished = !(await batchFetch.getNextBatch());
        }

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(numBatches);
    });

    /*
    [{ desc: "single batch", batches: 1 }, { desc: "multiple batches", batches: _.random(5, 10) }].forEach(test =>
        it(
            "supplies transactions from " + test.desc + " in a correct order: from the newest to the oldest",
            async () => {
                const { supplier, getAccountHistoryAsyncSpy } = prepare({
                    accountHistoryLength: 1000 * test.batches - 1,
                    batchSize: 1000,
                });

                const takenTransactions = await takeTransactionsFromSupplier(supplier);

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

    it("fetches whole account history", async () => {
        throw new Error("Specify");
    });

    it("does not duplicate transactions", async () => {
        throw new Error("Specify");
    });

    it("returns undefined on each subsequent fetch after whole account history has been fetched", async () => {
        throw new Error("Specify");
    });*/
});
