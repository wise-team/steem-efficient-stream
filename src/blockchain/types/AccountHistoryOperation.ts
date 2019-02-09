import { OperationWithDescriptor } from "./OperationWithDescriptor";

export type AccountHistoryOperation = [
    number,
    {
        block: number;
        op: OperationWithDescriptor;
        op_in_trx: number;
        timestamp: string;
        trx_id: string;
        trx_in_block: number;
        virtual_op: number;
    }
];
