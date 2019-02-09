/* tslint:disable:no-console */
import { AccountHistorySupplierFactory, SimpleTaker, SteemAdapterFactory } from "../src/index";

const steemAdapter = SteemAdapterFactory.withOptions({
    url: "https://anyx.io/",
});
const account = "wise-team";
const chainableSupplier = new AccountHistorySupplierFactory(steemAdapter, account)
    .withOptions({ batchSize: 5000, batchOverlap: 10 })
    .buildChainableSupplier();

chainableSupplier
    .chain(
        new SimpleTaker(transaction => {
            console.log(transaction);

            const returnNext = true;
            return returnNext;
        }),
    )
    .catch(error => {
        console.error(error);
        const continueTaking = false;
        return continueTaking;
    });

(async () => {
    await chainableSupplier.start();
})();
