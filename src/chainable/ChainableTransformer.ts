import { Chainable } from "./Chainable";

/**
 * Generic transformer that can be chained.
 */
export abstract class ChainableTransformer<
    FROM,
    TO,
    IMPLEMENTERCLASS extends ChainableTransformer<FROM, TO, IMPLEMENTERCLASS>
> extends Chainable<FROM, TO, IMPLEMENTERCLASS> {}
