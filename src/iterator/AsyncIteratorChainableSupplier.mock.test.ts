import { ChainableSupplier } from "../chainable/ChainableSupplier";
import { SimpleTaker } from "../chainable/SimpleTaker";

export namespace mock {
    export async function takeElemsFromSupplier<T>(
        supplier: ChainableSupplier<T, any>,
        takeCount: number = -1,
    ): Promise<T[]> {
        const takenElems: T[] = [];
        supplier.chain(
            new SimpleTaker<T>(elem => {
                takenElems.push(elem);
                const takeNext = takeCount > 0 ? takenElems.length < takeCount : true;
                return takeNext;
            }),
        );
        await supplier.start();
        return takenElems;
    }
}
