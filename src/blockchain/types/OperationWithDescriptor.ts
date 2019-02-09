import { CustomJsonOperation } from "./CustomJsonOperation";
import { OtherOperation } from "./OtherOperation";
import { VoteOperation } from "./VoteOperation";

export type OperationWithDescriptor =
    | VoteOperation.WithDescriptor
    | CustomJsonOperation.WithDescriptor
    | OtherOperation.WithDescriptor;
