export interface CustomJsonOperation {
    id: string;
    json: string;
    required_auths: string[];
    required_posting_auths: string[];
}

export namespace CustomJsonOperation {
    export type WithDescriptor = ["custom_json", CustomJsonOperation];
}
