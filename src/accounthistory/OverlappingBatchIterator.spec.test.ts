import { expect, use as chaiUse } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as _ from "lodash";
import "mocha";

import { UnifiedSteemTransaction } from "../blockchain/types/UnifiedSteemTransaction";
import { AsyncIterator } from "../iterator/AsyncIterator";
import { AsyncIteratorMock } from "../iterator/AsyncIteratorMock.test";
import { Log } from "../Log";

import { AccountHistoryOpsMock } from "./_test/AccountHistoryOpsMock.test";
import { OverlappingBatchIterator } from "./OverlappingBatchIterator";
import { mock } from "./OverlappingBatchIterator.mock.test";

Log.log().initialize();
chaiUse(chaiAsPromised);

describe("OverlappingBatchIterator", function() {
    it("rejects with error thrown by upstream iterator", async () => {
        const iteratorMock: AsyncIterator<UnifiedSteemTransaction[]> = {
            next(): Promise<IteratorResult<UnifiedSteemTransaction[]>> {
                throw new Error("Sample error");
            },
        };
        const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, 1);

        try {
            await overlappingBatchIterator.next();
            expect.fail("Should throw");
        } catch (error) {
            expect(error)
                .to.haveOwnProperty("message")
                .that.is.equal("Sample error");
        }
    });

    it("supplies all elements", async () => {
        const sampleBatches = mock.generateSampleBatches();
        const iteratorMock = new AsyncIteratorMock<UnifiedSteemTransaction[]>(_.cloneDeep(sampleBatches));
        const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, 1);

        const takenTrxs: UnifiedSteemTransaction[] = [];
        while (true) {
            const { done, value } = await overlappingBatchIterator.next();
            takenTrxs.push(...value);
            if (done) break;
        }

        const sampleTrxs = _.flatten(sampleBatches);
        expect(takenTrxs).to.be.deep.equal(sampleTrxs);
    });

    it("returns the same number of batches it receives", async () => {
        const sampleBatches = mock.generateSampleBatches();
        const iteratorMock = new AsyncIteratorMock<UnifiedSteemTransaction[]>(_.cloneDeep(sampleBatches));
        const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, 1);

        let takeCount = 0;
        while (true) {
            const { done } = await overlappingBatchIterator.next();
            takeCount++;
            if (done) break;
        }

        expect(sampleBatches.length).to.be.equal(takeCount);
    });

    it("first batch is missing overlap and the last one ends with the previous overlap", async () => {
        const overlapSize = _.random(3, 6);
        const sampleBatches = mock.generateSampleBatches();
        const iteratorMock = new AsyncIteratorMock<UnifiedSteemTransaction[]>(_.cloneDeep(sampleBatches));
        const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, overlapSize);

        const takenBatches: UnifiedSteemTransaction[][] = [];
        while (true) {
            const { done, value } = await overlappingBatchIterator.next();
            takenBatches.push(value);
            if (done) break;
        }

        const sampleBatchLength = sampleBatches[0].length;
        expect(takenBatches[0], "first batch")
            .to.be.an("array")
            .with.length(sampleBatchLength - overlapSize);

        for (let i = 1; i < sampleBatches.length - 1; i++) {
            expect(takenBatches[i], `middle batch ${i}`)
                .to.be.an("array")
                .with.length(sampleBatchLength);
        }

        expect(_.last(takenBatches), "last batch")
            .to.be.an("array")
            .with.length(sampleBatchLength + overlapSize);
    });

    it("joins two transactions with the same id that are outside of the overlap region", async () => {
        const sampleBatches = [
            [
                mock.sampleTrx(6, 0, "trx_6"),
                mock.sampleTrx(6, 0, "trx_6"),
                mock.sampleTrx(5, 0, "trx_5"),
                mock.sampleTrx(4, 0, "trx_4"),
                mock.sampleTrx(3, 0, "trx_3"),
                mock.sampleTrx(2, 0, "trx_2"),
            ],
            [mock.sampleTrx(1, 0, "trx_1")],
        ];
        const overlapSize = 1;
        const iteratorMock = new AsyncIteratorMock<UnifiedSteemTransaction[]>(_.cloneDeep(sampleBatches));
        const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, overlapSize);

        const { value } = await overlappingBatchIterator.next();

        const expectedLengthOfFirstBatchAfterJoin = 5 - overlapSize;
        expect(value)
            .to.be.an("array")
            .with.length(expectedLengthOfFirstBatchAfterJoin);
        expect(value[0].transaction_id).to.be.equal("trx_6");
        expect(value[0].ops)
            .to.be.an("array")
            .with.length(2);
    });

    it("joins more than two transactions with the same id that are outside of the overlap region", async () => {
        const sampleBatches = [
            [
                mock.sampleTrx(6, 0, "trx_6"),
                mock.sampleTrx(6, 0, "trx_6"),
                mock.sampleTrx(6, 0, "trx_6"),
                mock.sampleTrx(5, 0, "trx_5"),
                mock.sampleTrx(4, 0, "trx_4"),
                mock.sampleTrx(3, 0, "trx_3"),
                mock.sampleTrx(2, 0, "trx_2"),
            ],
            [mock.sampleTrx(1, 0, "trx_1")],
        ];
        const overlapSize = 1;
        const iteratorMock = new AsyncIteratorMock<UnifiedSteemTransaction[]>(_.cloneDeep(sampleBatches));
        const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, overlapSize);

        const { value } = await overlappingBatchIterator.next();

        const expectedLengthOfFirstBatchAfterJoin = 5 - overlapSize;
        expect(value)
            .to.be.an("array")
            .with.length(expectedLengthOfFirstBatchAfterJoin);
        expect(value[0].transaction_id).to.be.equal("trx_6");
        expect(value[0].ops)
            .to.be.an("array")
            .with.length(3);
    });

    it("joins two transactions with the same id that are in in the overlap region", async () => {
        const sampleBatches = [
            [
                mock.sampleTrx(7, 1, "trx_7"),
                mock.sampleTrx(6, 1, "trx_6"),
                mock.sampleTrx(5, 1, "trx_5"),
                mock.sampleTrx(4, 1, "trx_4"),
            ],
            [
                mock.sampleTrx(4, 1, "trx_4"),
                mock.sampleTrx(3, 1, "trx_3"),
                mock.sampleTrx(2, 1, "trx_2"),
                mock.sampleTrx(1, 1, "trx_1"),
            ],
            [mock.sampleTrx(0, 1, "trx_0")],
        ];
        const overlapSize = 1;
        const iteratorMock = new AsyncIteratorMock<UnifiedSteemTransaction[]>(_.cloneDeep(sampleBatches));
        const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, overlapSize);

        await overlappingBatchIterator.next(); // first batch
        const { value } = await overlappingBatchIterator.next(); // second batch

        const expectedLengthOfSecondBatchAfterJoin = 3;
        expect(value)
            .to.be.an("array")
            .with.length(expectedLengthOfSecondBatchAfterJoin);
        expect(value[0].transaction_id).to.be.equal("trx_4");
        expect(value[0].ops)
            .to.be.an("array")
            .with.length(2);
    });

    it("joins three transactions with the same id that are in in the overlap region", async () => {
        const sampleBatches = [
            [
                mock.sampleTrx(8, 1, "trx_8"),
                mock.sampleTrx(7, 1, "trx_7"),
                mock.sampleTrx(6, 1, "trx_6"),
                mock.sampleTrx(5, 1, "trx_5"),
                mock.sampleTrx(5, 1, "trx_5"),
            ],
            [
                mock.sampleTrx(5, 1, "trx_5"),
                mock.sampleTrx(4, 1, "trx_4"),
                mock.sampleTrx(3, 1, "trx_3"),
                mock.sampleTrx(2, 1, "trx_2"),
                mock.sampleTrx(1, 1, "trx_1"),
            ],
            [mock.sampleTrx(0, 1, "trx_0")],
        ];
        const overlapSize = 2;
        const iteratorMock = new AsyncIteratorMock<UnifiedSteemTransaction[]>(_.cloneDeep(sampleBatches));
        const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, overlapSize);

        await overlappingBatchIterator.next(); // first batch
        const { value } = await overlappingBatchIterator.next(); // second batch

        const expectedLengthOfSecondBatchAfterJoin = 4;
        expect(value)
            .to.be.an("array")
            .with.length(expectedLengthOfSecondBatchAfterJoin);
        expect(value[1].transaction_id).to.be.equal("trx_5");
        expect(value[1].ops)
            .to.be.an("array")
            .with.length(3);
    });

    [2, 3, 4, 5].forEach(opsInTrx =>
        it(`preserves order of operations when ${opsInTrx} ops are in each trx, overlap=8`, async () => {
            const batchSize = 83;
            const numOfTransactions = Math.floor(batchSize * 4.5);
            const overlapSize = 8;
            const sampleJoinedTrxs = AccountHistoryOpsMock.generateSampleMultipleTransactions(
                opsInTrx,
                "noisy",
                numOfTransactions,
            );
            const sampleSplitTrxs = _.flatten(
                sampleJoinedTrxs.map(trx => {
                    const newTrxs: UnifiedSteemTransaction[] = trx.ops.map(op => ({
                        ...trx,
                        ops: [op],
                    }));
                    return newTrxs;
                }),
            );
            const sampleBatchesReversed = _.chunk(_.reverse(sampleSplitTrxs), batchSize);

            const iteratorMock = new AsyncIteratorMock<UnifiedSteemTransaction[]>(_.cloneDeep(sampleBatchesReversed));
            const overlappingBatchIterator = new OverlappingBatchIterator(iteratorMock, overlapSize);

            const takenTrxs: UnifiedSteemTransaction[] = [];
            while (true) {
                const { done, value } = await overlappingBatchIterator.next();
                takenTrxs.push(...value);
                if (done) break;
            }

            const sampleJoinedTrxsFromNewestToOldest = _.reverse(sampleJoinedTrxs);
            expect(takenTrxs).to.deep.equal(sampleJoinedTrxsFromNewestToOldest);
        }),
    );
});
