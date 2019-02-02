import { Chainable } from "./Chainable";

/**
 * Generic filter that can be chained.
 */
export abstract class ChainableFilter<
    TYPE,
    IMPLEMENTERCLASS extends ChainableFilter<TYPE, IMPLEMENTERCLASS>
> extends Chainable<TYPE, TYPE, IMPLEMENTERCLASS> {}
