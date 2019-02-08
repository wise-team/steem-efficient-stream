import { expect } from "chai";
import * as _ from "lodash";
import "mocha";
import * as sinon from "sinon";

import { SimpleTaker } from "../chainable/SimpleTaker";
import { Log } from "../Log";

import { AsyncIterator } from "./AsyncIterator";
import { AsyncIteratorChainableSupplier } from "./AsyncIteratorChainableSupplier";
import { mock } from "./AsyncIteratorChainableSupplier.mock.test";

Log.log().initialize();

describe.only("AsyncIteratorChainableSupplier", function() {
    it("gives all elements", async () => {
        const iterableValues: mock.SampleObject[] = _.range(0, 20).map(i => ({ v: i }));
        const iteratorMock = new mock.AsyncIteratorMock<mock.SampleObject>(_.cloneDeep(iterableValues));
        const iteratorSupplier = new AsyncIteratorChainableSupplier(iteratorMock);
        const takenValues = await mock.takeElemsFromSupplier(iteratorSupplier);
        expect(takenValues).to.be.deep.equal(iterableValues);
    });

    it("gives error when iterator.next throws", async () => {
        const iteratorMock: AsyncIterator<mock.SampleObject> = {
            next(): Promise<IteratorResult<mock.SampleObject>> {
                throw new Error("Sample error");
            },
        };
        const iteratorSupplier = new AsyncIteratorChainableSupplier(iteratorMock);
        const foundErrors: Error[] = [];
        try {
            await iteratorSupplier
                .branch(me =>
                    me.chain(new SimpleTaker<mock.SampleObject>(elem => true)).catch(error => {
                        foundErrors.push(error);
                        return false;
                    }),
                )
                .start();
            expect.fail("Should throw");
        } catch (error) {
            expect(error)
                .to.haveOwnProperty("message")
                .that.is.equal("Sample error");
        }
        expect(foundErrors)
            .to.be.an("array")
            .with.length(1);
        expect(foundErrors[0])
            .to.haveOwnProperty("message")
            .that.is.equal("Sample error");
    });

    it("gives error when give throws", async () => {
        const iterableValues: mock.SampleObject[] = _.range(0, 20).map(i => ({ v: i }));
        const iteratorMock = new mock.AsyncIteratorMock<mock.SampleObject>(iterableValues);
        const iteratorSupplier = new AsyncIteratorChainableSupplier(iteratorMock);
        const foundErrors: Error[] = [];
        await iteratorSupplier
            .branch(me =>
                me
                    .chain(
                        new SimpleTaker<mock.SampleObject>(elem => {
                            throw new Error("Sample error");
                        }),
                    )
                    .catch(error => {
                        foundErrors.push(error);
                        return true;
                    }),
            )
            .start();
        expect(foundErrors)
            .to.be.an("array")
            .with.length(1);
        expect(foundErrors[0])
            .to.haveOwnProperty("message")
            .that.is.equal("Sample error");
    });

    it("stops iterating when taker does not want more", async () => {
        const iterableValues: mock.SampleObject[] = _.range(0, 20).map(i => ({ v: i }));
        const iteratorMock = new mock.AsyncIteratorMock<mock.SampleObject>(iterableValues);
        const nextSpy = sinon.spy(iteratorMock, "next");
        const iteratorSupplier = new AsyncIteratorChainableSupplier(iteratorMock);

        await iteratorSupplier
            .branch(me =>
                me
                    .chain(
                        new SimpleTaker<mock.SampleObject>(elem => {
                            return false;
                        }),
                    )
                    .catch(error => {
                        return false;
                    }),
            )
            .start();
        expect(nextSpy.callCount).to.be.equal(1);
    });

    it("stops iterating when iterator returns done", async () => {
        const iterableValues: mock.SampleObject[] = _.range(0, 20).map(i => ({ v: i }));
        const iteratorMock = new mock.AsyncIteratorMock<mock.SampleObject>(iterableValues);

        const nextSpy = sinon.spy(iteratorMock.next);

        const iteratorSupplier = new AsyncIteratorChainableSupplier(iteratorMock);
        await mock.takeElemsFromSupplier(iteratorSupplier);
        expect(nextSpy.callCount).to.be.equal(iterableValues.length);
    });
});
