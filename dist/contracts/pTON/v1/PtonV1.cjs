"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ton = require("@ton/ton");
const JettonMinter = require("../../core/JettonMinter.cjs");
const createJettonTransferMessage = require("../../../utils/createJettonTransferMessage.cjs");
const toAddress = require("../../../utils/toAddress.cjs");
const constants = require("../constants.cjs");
const _PtonV1 = class _PtonV12 extends JettonMinter.JettonMinter {
  constructor(address2 = _PtonV12.address, { gasConstants, ...options } = {}) {
    super(address2, options);
    this.gasConstants = {
      ..._PtonV12.gasConstants,
      ...gasConstants
    };
  }
  async getTonTransferTxParams(provider, params) {
    const to = await this.getWalletAddress(provider, params.destinationAddress);
    const body = createJettonTransferMessage.createJettonTransferMessage({
      queryId: params.queryId ?? 0,
      amount: params.tonAmount,
      destination: params.destinationAddress,
      forwardTonAmount: BigInt(params.forwardTonAmount ?? 0),
      forwardPayload: params.forwardPayload
    });
    const value = BigInt(params.tonAmount) + BigInt(params.forwardTonAmount ?? 0);
    return { to, value, body };
  }
  async sendTonTransfer(provider, via, params) {
    const txParams = await this.getTonTransferTxParams(provider, params);
    return via.send(txParams);
  }
  async createDeployWalletBody(params) {
    return ton.beginCell().storeUint(constants.pTON_OP_CODES.DEPLOY_WALLET_V1, 32).storeUint(params.queryId ?? 0, 64).storeAddress(toAddress.toAddress(params.ownerAddress)).endCell();
  }
  async getDeployWalletTxParams(provider, params) {
    const to = this.address;
    const body = await this.createDeployWalletBody({
      ownerAddress: params.ownerAddress,
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
_PtonV1.version = constants.pTON_VERSION.v1;
_PtonV1.address = ton.address(
  "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez"
);
_PtonV1.gasConstants = {
  deployWallet: ton.toNano("1.05")
};
let PtonV1 = _PtonV1;
exports.PtonV1 = PtonV1;
//# sourceMappingURL=PtonV1.cjs.map
