import { OperationWithDescriptor } from "./OperationWithDescriptor";

export interface UnifiedSteemTransaction {
    block_num: number;
    transaction_num: number;
    transaction_id: string;
    timestamp: Date;
    ops: OperationWithDescriptor[];
}
