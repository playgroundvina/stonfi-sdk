import { type Cell, type ContractProvider, type Sender, type SenderArguments } from "@ton/ton";
import type { ContractOptions } from '../../../contracts/core/Contract';
import { JettonMinter } from '../../../contracts/core/JettonMinter';
import type { AddressType, AmountType, QueryIdType } from '../../../types';
import { pTON_VERSION } from "../constants";
export interface PtonV1Options extends ContractOptions {
    gasConstants?: Partial<typeof PtonV1.gasConstants>;
}
export declare class PtonV1 extends JettonMinter {
    static readonly version: pTON_VERSION;
    static readonly address: import("@ton/ton").Address;
    static readonly gasConstants: {
        deployWallet: bigint;
    };
    readonly gasConstants: {
        deployWallet: bigint;
    };
    constructor(address?: AddressType, { gasConstants, ...options }?: PtonV1Options);
    getTonTransferTxParams(provider: ContractProvider, params: {
        tonAmount: AmountType;
        destinationAddress: AddressType;
        refundAddress: AddressType;
        forwardPayload?: Cell;
        forwardTonAmount?: AmountType;
        queryId?: QueryIdType;
    }): Promise<SenderArguments>;
    sendTonTransfer(provider: ContractProvider, via: Sender, params: Parameters<PtonV1["getTonTransferTxParams"]>[1]): Promise<void>;
    createDeployWalletBody(params: {
        ownerAddress: AddressType;
        queryId?: QueryIdType;
    }): Promise<Cell>;
    getDeployWalletTxParams(provider: ContractProvider, params: {
        ownerAddress: AddressType;
        gasAmount?: AmountType;
        queryId?: QueryIdType;
    }): Promise<SenderArguments>;
    sendDeployWallet(provider: ContractProvider, via: Sender, params: Parameters<PtonV1["getDeployWalletTxParams"]>[1]): Promise<void>;
}
