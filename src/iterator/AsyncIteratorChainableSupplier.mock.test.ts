import { ChainableSupplier } from "../chainable/ChainableSupplier";
import { SimpleTaker } from "../chainable/SimpleTaker";

import { AsyncIterator } from "./AsyncIterator";

export namespace mock {
    export interface SampleObject {
        v: number;
    }

    export class AsyncIteratorMock<T> implements AsyncIterator<T> {
        private values: T[];

        public constructor(values: T[]) {
            this.values = values;
        }

        public async next(): Promise<IteratorResult<T>> {
            const shifted = this.values.shift();
            if (shifted) {
                return { value: shifted, done: this.values.length === 0 };
            } else throw AsyncIterator.AsyncIteratorError.iteratorAlreadyDoneError();
        }
    }

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
