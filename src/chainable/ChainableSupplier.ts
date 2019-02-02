import { Chainable } from "./Chainable";

/**
 * Supplier that does not accept take.
 */
export abstract class ChainableSupplier<
    TO,
    IMPLEMENTERCLASS extends ChainableSupplier<TO, IMPLEMENTERCLASS>
> extends Chainable<undefined, TO, IMPLEMENTERCLASS> {
    public take(error: Error | undefined, item: undefined | undefined): boolean {
        throw new Error("Supplier cannot take.");
    }

    public abstract start(callback?: () => void): void;
}
