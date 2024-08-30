import { toNano, beginCell } from "@ton/ton";
import { toAddress } from "../../../utils/toAddress.js";
import { pTON_VERSION, pTON_OP_CODES } from "../constants.js";
import { PtonV1 } from "../v1/PtonV1.js";
const _PtonV2 = class _PtonV22 extends PtonV1 {
  constructor(address, { gasConstants, ...options } = {}) {
    super(address, options);
    this.gasConstants = {
      ..._PtonV22.gasConstants,
      ...gasConstants
    };
  }
  async createTonTransferBody(params) {
    const builder = beginCell();
    builder.storeUint(pTON_OP_CODES.TON_TRANSFER, 32);
    builder.storeUint(params.queryId ?? 0, 64);
    builder.storeCoins(BigInt(params.tonAmount));
    builder.storeAddress(toAddress(params.refundAddress));
    if (params.forwardPayload) {
      builder.storeBit(true);
      builder.storeRef(params.forwardPayload);
    }
    return builder.endCell();
  }
  async getTonTransferTxParams(provider, params) {
    const to = await this.getWalletAddress(provider, params.destinationAddress);
    const body = await this.createTonTransferBody({
      tonAmount: params.tonAmount,
      refundAddress: params.refundAddress,
      forwardPayload: params.forwardPayload,
      queryId: params.queryId
    });
    const value = BigInt(params.tonAmount) + BigInt(params.forwardTonAmount ?? 0) + BigInt(this.gasConstants.tonTransfer);
    return { to, value, body };
  }
  async sendTonTransfer(provider, via, params) {
    const txParams = await this.getTonTransferTxParams(provider, params);
    return via.send(txParams);
  }
  async createDeployWalletBody(params) {
    return beginCell().storeUint(pTON_OP_CODES.DEPLOY_WALLET_V2, 32).storeUint(params.queryId ?? 0, 64).storeAddress(toAddress(params.ownerAddress)).storeAddress(toAddress(params.excessAddress)).endCell();
  }
  async getDeployWalletTxParams(provider, params) {
    const to = this.address;
    const body = await this.createDeployWalletBody({
      ownerAddress: params.ownerAddress,
      excessAddress: params.excessAddress ?? params.ownerAddress,
      queryId: params == null ? void 0 : params.queryId
    });
    const value = BigInt((params == null ? void 0 : params.gasAmount) ?? this.gasConstants.deployWallet);
    return { to, value, body };
  }
  async sendDeployWallet(provider, via, params) {
    const txParams = await this.getDeployWalletTxParams(provider, params);
    return via.send(txParams);
  }
};
_PtonV2.version = pTON_VERSION.v2;
_PtonV2.gasConstants = {
  tonTransfer: toNano("0.01"),
  deployWallet: toNano("0.1")
};
let PtonV2 = _PtonV2;
export {
  PtonV2
};
//# sourceMappingURL=PtonV2.js.map
