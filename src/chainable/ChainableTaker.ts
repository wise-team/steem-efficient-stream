import { Chainable } from "./Chainable";

/**
 * Taker that cannot be branched or chained.
 */
export abstract class ChainableTaker<
    FROM,
    IMPLEMENTERCLASS extends ChainableTaker<FROM, IMPLEMENTERCLASS>
> extends Chainable<FROM, undefined, IMPLEMENTERCLASS> {
    public chain<N extends Chainable<undefined, any, any>>(chainable: N): N {
        throw new Error("Cannot chain from Taker.");
    }

    public branch(branchFn: (me: IMPLEMENTERCLASS) => void): IMPLEMENTERCLASS {
        throw new Error("Cannot branch from Taker.");
    }

    protected give(error: Error | undefined, item: undefined | undefined): boolean {
        throw new Error("Taker has no downstream. Cannot call his give");
    }
}
