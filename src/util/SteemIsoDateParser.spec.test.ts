import { expect } from "chai";
import * as _ from "lodash";
import "mocha";

import { Log } from "../Log";

import { SteemISODateParser } from "./SteemISODateParser";

Log.log().initialize();

describe("SteemISODateParser", function() {
    it("parses correctly date without timezone", async () => {
        const isoDate = "2019-02-09T00:00:00";
        const expectedTimestampMs = 1549670400000;
        expect(SteemISODateParser.parse(isoDate).getTime()).to.be.equal(expectedTimestampMs);
    });

    it("parses correctly date with 'Z' timezone", async () => {
        const isoDate = "2019-02-09T00:00:00Z";
        const expectedTimestampMs = 1549670400000;
        expect(SteemISODateParser.parse(isoDate).getTime()).to.be.equal(expectedTimestampMs);
    });

    it("parses correctly date with numeric timezone", async () => {
        const isoDate = "2019-02-09T01:00:00+01:00";
        const expectedTimestampMs = 1549670400000;
        expect(SteemISODateParser.parse(isoDate).getTime()).to.be.equal(expectedTimestampMs);
    });
});
