import { type Cell, type ContractProvider, type Sender, type SenderArguments } from "@ton/ton";
import type { AddressType, AmountType, QueryIdType } from '../../../types';
import { PtonV1, type PtonV1Options } from "../v1/PtonV1";
export interface PtonV2Options extends PtonV1Options {
    gasConstants?: Partial<typeof PtonV2.gasConstants>;
}
export declare class PtonV2 extends PtonV1 {
    static readonly version: "v2";
    static readonly gasConstants: {
        tonTransfer: bigint;
        deployWallet: bigint;
    };
    readonly gasConstants: {
        tonTransfer: bigint;
        deployWallet: bigint;
    };
    constructor(address: AddressType, { gasConstants, ...options }?: PtonV2Options);
    createTonTransferBody(params: {
        tonAmount: AmountType;
        refundAddress: AddressType;
        forwardPayload?: Cell;
        queryId?: QueryIdType;
    }): Promise<Cell>;
    getTonTransferTxParams(provider: ContractProvider, params: {
        tonAmount: AmountType;
        destinationAddress: AddressType;
        refundAddress: AddressType;
        forwardPayload?: Cell;
        forwardTonAmount?: AmountType;
        queryId?: QueryIdType;
    }): Promise<SenderArguments>;
    sendTonTransfer(provider: ContractProvider, via: Sender, params: Parameters<PtonV2["getTonTransferTxParams"]>[1]): Promise<void>;
    createDeployWalletBody(params: {
        ownerAddress: AddressType;
        excessAddress: AddressType;
        queryId?: QueryIdType;
    }): Promise<Cell>;
    getDeployWalletTxParams(provider: ContractProvider, params: {
        ownerAddress: AddressType;
        excessAddress?: AddressType;
        gasAmount?: AmountType;
        queryId?: QueryIdType;
    }): Promise<SenderArguments>;
    sendDeployWallet(provider: ContractProvider, via: Sender, params: Parameters<PtonV2["getDeployWalletTxParams"]>[1]): Promise<void>;
}
