/* tslint:disable:no-console */
import { AccountHistorySupplierFactory, SteemAdapterFactory } from "../src/index";

const steemAdapter = SteemAdapterFactory.withOptions({
    url: "https://anyx.io/",
});
const account = "wise-team";
const iterator = new AccountHistorySupplierFactory(steemAdapter, account)
    .withOptions({ batchSize: 5000, batchOverlap: 10 })
    .buildIterator();

(async () => {
    while (true) {
        const { done, value } = await iterator.next();
        const transaction = value;

        console.log(transaction);

        if (done) break;
    }
})();
