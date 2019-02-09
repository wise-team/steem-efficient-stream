export interface VoteOperation {
    voter: string;
    author: string;
    permlink: string;
    weight: number;
}

export namespace VoteOperation {
    export type WithDescriptor = ["vote", VoteOperation];
}
