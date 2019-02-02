import { Log } from "../Log";

export abstract class Chainable<FROM, TO, IMPLEMENTERCLASS extends Chainable<FROM, TO, IMPLEMENTERCLASS>> {
    // IMPLEMENTATION
    private downstreamChainables: Array<Chainable<TO, any, any>> = [];

    public chain<N extends Chainable<TO, any, any>>(chainable: N): N {
        this.downstreamChainables.push(chainable);
        return chainable;
    }

    public branch(branchFn: (me: IMPLEMENTERCLASS) => void): IMPLEMENTERCLASS {
        branchFn(this.me());
        return this.me();
    }
    // ABSTRACT MEMBERS
    protected abstract take(error: Error | undefined, item: FROM): boolean;
    protected abstract me(): IMPLEMENTERCLASS;

    protected shouldLoadNewItems(): boolean {
        return this.downstreamChainables.length > 0;
    }

    protected give(error: Error | undefined, item: TO | undefined): boolean {
        if (this.downstreamChainables.length === 0) {
            return false;
        }

        // slice copies object references into the new array. Both the original and new array refer to the same object.
        const frozenDownstream: Array<Chainable<TO, any, any>> = this.downstreamChainables.slice();
        for (const downstreamChainable of frozenDownstream) {
            const result = downstreamChainable.doTake(error, item);
            if (!result) {
                const consumerIndex = this.downstreamChainables.indexOf(downstreamChainable);
                if (consumerIndex !== -1) {
                    this.downstreamChainables.splice(consumerIndex, 1);
                }
            }
        }
        return this.shouldLoadNewItems();
    }

    protected doTake(error: Error | undefined, item: FROM | undefined): boolean {
        if (typeof item === "undefined" && !error) {
            throw new Error("Got undefined item");
        }

        try {
            return this.take(error, item as FROM);
        } catch (error) {
            this.give(error, undefined);
            return false;
        }
    }
}
