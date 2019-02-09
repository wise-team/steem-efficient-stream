import { SteemAdapter } from "./SteemAdapter";
import { AccountHistoryOperation } from "./types/AccountHistoryOperation";

export class SteemAdapterMock implements SteemAdapter {
    public async getAccountHistoryAsync(
        username: string,
        from: number,
        limit: number,
    ): Promise<AccountHistoryOperation[]> {
        throw new Error("Method not mocked");
    }
}
