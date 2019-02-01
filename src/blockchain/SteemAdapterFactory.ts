import { SteemAdapter } from "./SteemAdapter";
import { SteemAdapterImpl } from "./SteemAdapterImpl";
import { SteemAdapterMock } from "./SteemAdapterMock";

export namespace SteemAdapterFactory {
    export function withOptions(options: SteemAdapter.Options): SteemAdapter {
        return new SteemAdapterImpl(options);
    }

    export function mock(): SteemAdapter {
        return new SteemAdapterMock();
    }
}
