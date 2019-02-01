import { SteemAdapter } from "./SteemAdapter";
import { SteemAdapterImpl } from "./SteemAdapterImpl";

export namespace SteemAdapterFactory {
    export function withOptions(options: SteemAdapter.Options): SteemAdapter {
        return new SteemAdapterImpl(options);
    }
}
