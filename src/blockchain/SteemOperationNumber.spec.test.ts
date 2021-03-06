import { expect } from "chai";
import * as _ from "lodash";
import "mocha";

// wise imports
import { SteemOperationNumber } from "./SteemOperationNumber";

describe("SteemOperationNumber", () => {
    describe("#compare", () => {
        it("Sorting using #compare does it in correct order", () => {
            const sorted: SteemOperationNumber[] = [
                SteemOperationNumber.NEVER,
                new SteemOperationNumber(0, 0, 0),
                new SteemOperationNumber(20, 0, 0),
                new SteemOperationNumber(30, 0, 0),
                new SteemOperationNumber(40, 0, 0),
                new SteemOperationNumber(40, 1, 100),
                new SteemOperationNumber(40, 5, 100),
                new SteemOperationNumber(40, 100, 5),
                new SteemOperationNumber(40, 100, 100),
                new SteemOperationNumber(50, 0, 0),
                SteemOperationNumber.NOW,
                SteemOperationNumber.FUTURE,
            ];
            const random = _.shuffle(_.cloneDeep(sorted));

            random.sort(SteemOperationNumber.compare);
            expect(sorted).to.deep.equal(random);
        });
    });
});
