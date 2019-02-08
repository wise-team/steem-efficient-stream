import { expect, use as chaiUse } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as _ from "lodash";
import "mocha";
import * as sinon from "sinon";
import * as steem from "steem";

import { SteemAdapterFactory } from "../blockchain/SteemAdapterFactory";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { Log } from "../Log";

import { RawBatchIterator } from "./RawBatchIterator";
import { prepare } from "./RawBatchIterator.mocks.test";

Log.log().initialize();
chaiUse(chaiAsPromised);

describe("RawBatchIterator", function() {
    const defaultProps = {
        accountHistoryLength: _.random(100, 1000),
        batchSize: _.random(10, 50),
    };

    it("rejects with error thrown by SteemAdapter", async () => {
        const steemAdapter = SteemAdapterFactory.mock();
        steemAdapter.getAccountHistoryAsync = sinon.fake.rejects(new Error("Test error"));
        const batchFetch = new RawBatchIterator({ steemAdapter, batchSize: 100, account: "doesnt matter" });

        try {
            await batchFetch.next();
            expect.fail("Should throw");
        } catch (error) {
            expect(error)
                .to.haveOwnProperty("message")
                .that.is.equal("Test error");
        }
    });

    it("returns whole batch", async () => {
        const { batchFetch } = prepare(defaultProps);

        const { value, done } = await batchFetch.next();
        expect(value.length).to.be.equal(defaultProps.batchSize);
    });

    it("returns done subsequentially after whole account history has been fetched", async () => {
        const { batchFetch } = prepare({
            accountHistoryLength: 10,
            batchSize: 20,
        });

        {
            const { done } = await batchFetch.next();
            expect(done).to.be.equal(true);
        }
        {
            const { done } = await batchFetch.next();
            expect(done).to.be.equal(true);
        }
    });

    it("queries only once if batch returns lower number of operations than limit", async () => {
        const { batchFetch, getAccountHistoryAsyncSpy } = prepare({
            accountHistoryLength: _.random(0, 999),
            batchSize: 1000,
        });

        await batchFetch.next();

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(1);
    });

    it("queries with correct batchSize", async () => {
        const batchSize = _.random(10, 1000);
        const { batchFetch, getAccountHistoryAsyncSpy, account } = prepare({
            accountHistoryLength: _.random(1, 999),
            batchSize,
        });

        await batchFetch.next();

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(1);
        const realBatchSize = batchSize - 1;
        expect(getAccountHistoryAsyncSpy.firstCall.args).to.deep.equal([account, -1, realBatchSize]);
    });

    const baseBatchSize = _.random(40, 60);
    const numOfFullBatches = _.random(5, 10);
    [
        {
            name: "Query batches does not overlap when account history length is multiplication of batch size",
            accountHistoryLength: baseBatchSize * numOfFullBatches, // + 0
            numOfBatches: numOfFullBatches,
        },
        {
            name: "Query batches does not overlap when account history length is multiplication of batch size plus 1",
            accountHistoryLength: baseBatchSize * numOfFullBatches + 1,
            numOfBatches: numOfFullBatches + 1,
        },
        {
            name: "Query batches does not overlap when account history length is multiplication of batch size minus 1",
            accountHistoryLength: baseBatchSize * numOfFullBatches - 1,
            numOfBatches: numOfFullBatches,
        },
    ].forEach(test =>
        it(test.name, async () => {
            const accountHistoryLength = test.accountHistoryLength;
            const { batchFetch, getAccountHistoryAsyncSpy, fakeAccountHistoryOps } = prepare({
                accountHistoryLength,
                batchSize: baseBatchSize,
            });

            while (true) {
                const { done } = await batchFetch.next();
                if (done) {
                    break;
                }
            }

            let sum = 0;
            for (const call of getAccountHistoryAsyncSpy.getCalls()) {
                sum += (await call.returnValue).length;
            }
            expect(fakeAccountHistoryOps.length).to.be.equal(accountHistoryLength);
            expect(sum, "sum").to.be.equal(fakeAccountHistoryOps.length);
            expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(test.numOfBatches);
        }),
    );

    it("does not loop endlessly when accountHistoryLength is a multiplication of batchSize", async () => {
        const batchSize = Math.floor(Math.random() * 1000);
        const numBatches = _.random(5, 10);
        const { batchFetch, getAccountHistoryAsyncSpy } = prepare({
            accountHistoryLength: batchSize * numBatches,
            batchSize,
        });

        while (true) {
            const { done } = await batchFetch.next();
            if (done) {
                break;
            }
        }

        expect(getAccountHistoryAsyncSpy.callCount).to.be.equal(numBatches);
    });

    it("supplies all transactions from the newest to the oldest", async () => {
        const { batchFetch, getAccountHistoryAsyncSpy, fakeAccountHistoryOps } = prepare({
            accountHistoryLength: _.random(50, 80),
            batchSize: _.random(2, 5),
        });

        const retrivedTrxs: UnifiedSteemTransaction[] = [];
        while (true) {
            const { value, done } = await batchFetch.next();
            retrivedTrxs.push(...value);
            if (done) {
                break;
            }
        }
        const retrivedTrxIds = retrivedTrxs.map(trx => trx.transaction_id);
        const mockedTrxIds = fakeAccountHistoryOps.map((op: steem.AccountHistory.Operation) => op[1].trx_id);
        expect(retrivedTrxIds).to.be.equal(mockedTrxIds);
    });

    it("fetches whole account history", async () => {
        throw new Error("Specify");
    });

    it("does not duplicate transactions", async () => {
        throw new Error("Specify");
    });

    it("returns undefined on each subsequent fetch after whole account history has been fetched", async () => {
        throw new Error("Specify");
    });
});
