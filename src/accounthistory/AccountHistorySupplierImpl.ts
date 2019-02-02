/* PROMISE_DEF */
import * as BluebirdPromise from "bluebird";
/* END_PROMISE_DEF */
import * as _ from "lodash";
import * as steem from "steem";
import ow from "ow";

import { Log } from "../Log";
import { UnifiedSteemTransaction } from "../blockchain/UnifiedSteemTransaction";
import { SteemAdapter } from "../blockchain/SteemAdapter";
import { ChainableSupplier, Chainable, SimpleTaker } from "../chainable/Chainable";
import { RawBatchSupplier } from "./RawBatchSupplier";
import { NonJoiningOpToTrxBatchTransformer } from "./NonJoiningOpToTrxBatchTransformer";
import { BatchOverlapTrxJoiner } from "./BatchOverlapTrxJoiner";

export class AccountHistorySupplierImpl extends ChainableSupplier<UnifiedSteemTransaction, AccountHistorySupplierImpl> {
    private supplier: ChainableSupplier<steem.AccountHistory.Operation[], any>;
    private batchOverlap: number;

    constructor(steemAdapter: SteemAdapter, props: { username: string; batchSize: number; batchOverlap: number }) {
        super();

        ow(steemAdapter, ow.object.is(o => SteemAdapter.isSteemAdapter(o)).label("steemAdapter"));

        const username = props.username;
        ow(username, ow.string.minLength(3).label("username"));

        const batchSize = props.batchSize;
        ow(batchSize, ow.number.integer.finite.label("batchSize"));

        this.batchOverlap = props.batchOverlap;
        ow(
            this.batchOverlap,
            ow.number.integer
                .greaterThan(0)
                .lessThan(batchSize - 1)
                .finite.label("batchOverlap")
        );

        this.supplier = new RawBatchSupplier({ steemAdapter, account: username, batchSize });
    }

    protected me(): AccountHistorySupplierImpl {
        return this;
    }

    public async start(): Promise<void> {
        console.log("AccountHistorySupplierImpl.start() started");
        await this.supplier
            .branch(historySupplier => {
                historySupplier
                    .chain(new NonJoiningOpToTrxBatchTransformer())
                    .chain(new BatchOverlapTrxJoiner(this.batchOverlap))
                    .chain(
                        new SimpleTaker(
                            (trx: UnifiedSteemTransaction): boolean => {
                                console.log(`AccountHistorySupplierImpl.give(${trx})`);
                                return this.give(undefined, trx);
                            }
                        )
                    )
                    .catch(
                        (error: Error): boolean => {
                            console.log(`AccountHistorySupplierImpl.start().catch(${error})`);
                            return this.give(error, undefined);
                        }
                    );
            })
            .start();
        console.log("AccountHistorySupplierImpl.start() finished");
    }
}
