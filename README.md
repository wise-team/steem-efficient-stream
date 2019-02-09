# steem-efficient-stream
Efficient way to stream blocks and account history from steem blockchain

Installation:

```bash
$ npm i --save steem-efficient-stream
```

It already includes typescript types. There is no need to install them separately.



## Streaming account history

Key features of steem-efficient-stream:

1. **Iterate over single transactions.** The library fetches next batch when it is needed.
2. **Join operations that belongs to the same transaction**
3. **Maintains correct order of operations in transaction**
4. **Joins operations of single transaction that are split across two batches**: uses overlapping buffer to join them. The option `overlapDepth` specifies the max number of operations of single transaction that are spread on the edge of batches.
5. **Unified format for transactions**. Transactions streamed from block cache or from account_history are unified into single UnifiedSteemTransaction format.

There are two ways to fetch account history: via AsyncIterator or via ChainableSupplier



### the AsyncIterator way

```typescript
/* tslint:disable:no-console */
import { AccountHistorySupplierFactory, SteemAdapterFactory } from "steem-efficient-stream";

const steemAdapter = SteemAdapterFactory.withOptions({
    url: "https://anyx.io/",
});
const account = "wise-team";
const iterator = new AccountHistorySupplierFactory(steemAdapter, account).withOptions({ batchSize: 5000, batchOverlap: 10 }).buildIterator();

(async () => {
    while (true) {
        const { done, value } = await iterator.next();
        const transaction = value;

        console.log(transaction);

        if (done) break;
    }
})();

```



### the ChainableSupplier ways

```typescript
/* tslint:disable:no-console */
import { AccountHistorySupplierFactory, SimpleTaker, SteemAdapterFactory } from "steem-efficient-stream";

const steemAdapter = SteemAdapterFactory.withOptions({
    url: "https://anyx.io/",
});
const account = "wise-team";
const chainableSupplier = new AccountHistorySupplierFactory(steemAdapter, account).withOptions({ batchSize: 5000, batchOverlap: 10 }).buildChainableSupplier();

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

```





## Streaming blocks

> (!) Streaming blocks is not moved from steem-wise-sql and steem-wise-core, but will be moved, merged and tested soon.