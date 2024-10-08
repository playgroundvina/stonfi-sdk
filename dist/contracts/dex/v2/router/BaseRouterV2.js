import { toNano, beginCell } from "@ton/ton";
import { Contract } from "../../../core/Contract.js";
import { DEX_VERSION, DEX_OP_CODES } from "../../constants.js";
import { JettonMinter } from "../../../core/JettonMinter.js";
import { createJettonTransferMessage } from "../../../../utils/createJettonTransferMessage.js";
import { toAddress } from "../../../../utils/toAddress.js";
import { BasePoolV2 } from "../pool/BasePoolV2.js";
import { VaultV2 } from "../vault/VaultV2.js";
const _BaseRouterV2 = class _BaseRouterV22 extends Contract {
  constructor(address, { gasConstants, ...options } = {}) {
    super(address, options);
    this.gasConstants = {
      ..._BaseRouterV22.gasConstants,
      ...gasConstants
    };
  }
  async createSwapBody(params) {
    if (params.referralValue && (BigInt(params.referralValue) < 0 || BigInt(params.referralValue) > 100)) {
      throw Error(`'referralValue' should be in range [0, 100] BPS`);
    }
    return beginCell().storeUint(DEX_OP_CODES.SWAP, 32).storeAddress(toAddress(params.askJettonWalletAddress)).storeAddress(toAddress(params.refundAddress)).storeAddress(toAddress(params.excessesAddress ?? params.refundAddress)).storeRef(
      beginCell().storeCoins(BigInt(params.minAskAmount)).storeAddress(toAddress(params.receiverAddress)).storeCoins(BigInt(params.customPayloadForwardGasAmount ?? 0)).storeMaybeRef(params.customPayload).storeCoins(BigInt(params.refundForwardGasAmount ?? 0)).storeMaybeRef(params.refundPayload).storeUint(BigInt(params.referralValue ?? 10), 16).storeAddress(
        params.referralAddress ? toAddress(params.referralAddress) : null
      ).endCell()
    ).endCell();
  }
  async createCrossSwapBody(params) {
    if (params.referralValue && (BigInt(params.referralValue) < 0 || BigInt(params.referralValue) > 100)) {
      throw Error(`'referralValue' should be in range [0, 100] BPS`);
    }
    return beginCell().storeUint(DEX_OP_CODES.CROSS_SWAP, 32).storeAddress(toAddress(params.askJettonWalletAddress)).storeAddress(toAddress(params.refundAddress)).storeAddress(toAddress(params.excessesAddress ?? params.refundAddress)).storeRef(
      beginCell().storeCoins(BigInt(params.minAskAmount)).storeAddress(toAddress(params.receiverAddress)).storeCoins(BigInt(params.customPayloadForwardGasAmount ?? 0)).storeMaybeRef(params.customPayload).storeCoins(BigInt(params.refundForwardGasAmount ?? 0)).storeMaybeRef(params.refundPayload).storeUint(BigInt(params.referralValue ?? 10), 16).storeAddress(
        params.referralAddress ? toAddress(params.referralAddress) : null
      ).endCell()
    ).endCell();
  }
  async getSwapJettonToJettonTxParams(provider, params) {
    const contractAddress = this.address;
    const [offerJettonWalletAddress, askJettonWalletAddress] = await Promise.all([
      provider.open(JettonMinter.create(params.offerJettonAddress)).getWalletAddress(
        params.proxyContractAddress ?? params.userWalletAddress
      ),
      provider.open(JettonMinter.create(params.askJettonAddress)).getWalletAddress(contractAddress)
    ]);
    const forwardTonAmount = BigInt(
      params.forwardGasAmount ?? this.gasConstants.swapJettonToJetton.forwardGasAmount
    );
    const forwardPayload = await this.createSwapBody({
      askJettonWalletAddress,
      receiverAddress: params.userWalletAddress,
      minAskAmount: params.minAskAmount,
      refundAddress: params.refundAddress ?? params.userWalletAddress,
      excessesAddress: params.excessesAddress,
      referralAddress: params.referralAddress,
      referralValue: params.referralValue,
      customPayload: params.customPayload,
      customPayloadForwardGasAmount: params.customPayloadForwardGasAmount,
      refundPayload: params.refundPayload,
      refundForwardGasAmount: params.refundForwardGasAmount
    });
    const body = createJettonTransferMessage({
      queryId: params.queryId ?? 0,
      amount: params.offerAmount,
      destination: contractAddress,
      responseDestination: params.userWalletAddress,
      forwardPayload,
      forwardTonAmount
    });
    const value = BigInt(
      params.gasAmount ?? this.gasConstants.swapJettonToJetton.gasAmount
    );
    return {
      to: offerJettonWalletAddress,
      value,
      body
    };
  }
  async sendSwapJettonToJetton(provider, via, params) {
    const txParams = await this.getSwapJettonToJettonTxParams(provider, params);
    return via.send(txParams);
  }
  async getSwapJettonToTonTxParams(provider, params) {
    return await this.getSwapJettonToJettonTxParams(provider, {
      ...params,
      askJettonAddress: params.proxyTon.address,
      gasAmount: params.gasAmount ?? this.gasConstants.swapJettonToTon.gasAmount,
      forwardGasAmount: params.forwardGasAmount ?? this.gasConstants.swapJettonToTon.forwardGasAmount
    });
  }
  async sendSwapJettonToTon(provider, via, params) {
    const txParams = await this.getSwapJettonToTonTxParams(provider, params);
    return via.send(txParams);
  }
  async getSwapTonToJettonTxParams(provider, params) {
    const contractAddress = this.address;
    const askJettonWalletAddress = await provider.open(JettonMinter.create(params.askJettonAddress)).getWalletAddress(contractAddress);
    const forwardPayload = await this.createSwapBody({
      askJettonWalletAddress,
      receiverAddress: params.userWalletAddress,
      minAskAmount: params.minAskAmount,
      refundAddress: params.refundAddress ?? params.userWalletAddress,
      excessesAddress: params.excessesAddress,
      referralAddress: params.referralAddress,
      referralValue: params.referralValue,
      customPayload: params.customPayload,
      customPayloadForwardGasAmount: params.customPayloadForwardGasAmount,
      refundPayload: params.refundPayload,
      refundForwardGasAmount: params.refundForwardGasAmount
    });
    const forwardTonAmount = BigInt(
      params.forwardGasAmount ?? this.gasConstants.swapTonToJetton.forwardGasAmount
    );
    return await provider.open(params.proxyTon).getTonTransferTxParams({
      queryId: params.queryId ?? 0,
      tonAmount: params.offerAmount,
      destinationAddress: contractAddress,
      refundAddress: params.userWalletAddress,
      forwardPayload,
      forwardTonAmount
    });
  }
  async sendSwapTonToJetton(provider, via, params) {
    const txParams = await this.getSwapTonToJettonTxParams(provider, params);
    return via.send(txParams);
  }
  async createProvideLiquidityBody(params) {
    return beginCell().storeUint(DEX_OP_CODES.PROVIDE_LP, 32).storeAddress(toAddress(params.routerWalletAddress)).storeAddress(toAddress(params.refundAddress)).storeAddress(toAddress(params.excessesAddress ?? params.refundAddress)).storeRef(
      beginCell().storeCoins(BigInt(params.minLpOut)).storeAddress(toAddress(params.receiverAddress)).storeUint(params.bothPositive ? 1 : 0, 1).storeCoins(BigInt(params.customPayloadForwardGasAmount ?? 0)).storeMaybeRef(params.customPayload).endCell()
    ).endCell();
  }
  async createCrossProvideLiquidityBody(params) {
    return beginCell().storeUint(DEX_OP_CODES.CROSS_PROVIDE_LP, 32).storeAddress(toAddress(params.routerWalletAddress)).storeAddress(toAddress(params.refundAddress)).storeAddress(toAddress(params.excessesAddress ?? params.refundAddress)).storeRef(
      beginCell().storeCoins(BigInt(params.minLpOut)).storeAddress(toAddress(params.receiverAddress)).storeUint(params.bothPositive ? 1 : 0, 1).storeCoins(BigInt(params.customPayloadForwardGasAmount ?? 0)).storeMaybeRef(params.customPayload).endCell()
    ).endCell();
  }
  async getProvideLiquidityJettonTxParams(provider, params) {
    return this.implGetProvideLiquidityJettonTxParams(provider, {
      ...params,
      gasAmount: params.gasAmount ?? this.gasConstants.provideLpJetton.gasAmount,
      forwardGasAmount: params.forwardGasAmount ?? this.gasConstants.provideLpJetton.forwardGasAmount,
      bothPositive: true
    });
  }
  async sendProvideLiquidityJetton(provider, via, params) {
    const txParams = await this.getProvideLiquidityJettonTxParams(
      provider,
      params
    );
    return via.send(txParams);
  }
  async getSingleSideProvideLiquidityJettonTxParams(provider, params) {
    return this.implGetProvideLiquidityJettonTxParams(provider, {
      ...params,
      gasAmount: params.gasAmount ?? this.gasConstants.singleSideProvideLpJetton.gasAmount,
      forwardGasAmount: params.forwardGasAmount ?? this.gasConstants.singleSideProvideLpJetton.forwardGasAmount,
      bothPositive: false
    });
  }
  async sendSingleSideProvideLiquidityJetton(provider, via, params) {
    const txParams = await this.getSingleSideProvideLiquidityJettonTxParams(
      provider,
      params
    );
    return via.send(txParams);
  }
  async implGetProvideLiquidityJettonTxParams(provider, params) {
    const contractAddress = this.address;
    const [jettonWalletAddress, routerWalletAddress] = await Promise.all([
      provider.open(JettonMinter.create(params.sendTokenAddress)).getWalletAddress(params.userWalletAddress),
      provider.open(JettonMinter.create(params.otherTokenAddress)).getWalletAddress(contractAddress)
    ]);
    const forwardPayload = await this.createProvideLiquidityBody({
      routerWalletAddress,
      receiverAddress: params.userWalletAddress,
      minLpOut: params.minLpOut,
      refundAddress: params.refundAddress ?? params.userWalletAddress,
      excessesAddress: params.excessesAddress,
      customPayload: params.customPayload,
      customPayloadForwardGasAmount: params.customPayloadForwardGasAmount,
      bothPositive: params.bothPositive
    });
    const forwardTonAmount = BigInt(params.forwardGasAmount);
    const body = createJettonTransferMessage({
      queryId: params.queryId ?? 0,
      amount: params.sendAmount,
      destination: contractAddress,
      responseDestination: params.userWalletAddress,
      forwardTonAmount,
      forwardPayload
    });
    const value = BigInt(params.gasAmount);
    return {
      to: jettonWalletAddress,
      value,
      body
    };
  }
  async getProvideLiquidityTonTxParams(provider, params) {
    return this.implGetProvideLiquidityTonTxParams(provider, {
      ...params,
      forwardGasAmount: params.forwardGasAmount ?? this.gasConstants.provideLpTon.forwardGasAmount,
      bothPositive: true
    });
  }
  async sendProvideLiquidityTon(provider, via, params) {
    const txParams = await this.getProvideLiquidityTonTxParams(
      provider,
      params
    );
    return via.send(txParams);
  }
  async getSingleSideProvideLiquidityTonTxParams(provider, params) {
    return this.implGetProvideLiquidityTonTxParams(provider, {
      ...params,
      forwardGasAmount: params.forwardGasAmount ?? this.gasConstants.singleSideProvideLpTon.forwardGasAmount,
      bothPositive: false
    });
  }
  async sendSingleSideProvideLiquidityTon(provider, via, params) {
    const txParams = await this.getSingleSideProvideLiquidityTonTxParams(
      provider,
      params
    );
    return via.send(txParams);
  }
  async implGetProvideLiquidityTonTxParams(provider, params) {
    const contractAddress = this.address;
    const routerWalletAddress = await provider.open(JettonMinter.create(params.otherTokenAddress)).getWalletAddress(contractAddress);
    const forwardPayload = await this.createProvideLiquidityBody({
      routerWalletAddress,
      receiverAddress: params.userWalletAddress,
      minLpOut: params.minLpOut,
      refundAddress: params.refundAddress ?? params.userWalletAddress,
      excessesAddress: params.excessesAddress,
      customPayload: params.customPayload,
      customPayloadForwardGasAmount: params.customPayloadForwardGasAmount,
      bothPositive: params.bothPositive
    });
    const forwardTonAmount = BigInt(params.forwardGasAmount);
    return await provider.open(params.proxyTon).getTonTransferTxParams({
      queryId: params.queryId ?? 0,
      tonAmount: params.sendAmount,
      destinationAddress: contractAddress,
      refundAddress: params.userWalletAddress,
      forwardPayload,
      forwardTonAmount
    });
  }
  async getPoolAddress(provider, params) {
    const result = await provider.get("get_pool_address", [
      {
        type: "slice",
        cell: beginCell().storeAddress(toAddress(params.token0)).endCell()
      },
      {
        type: "slice",
        cell: beginCell().storeAddress(toAddress(params.token1)).endCell()
      }
    ]);
    return result.stack.readAddress();
  }
  async getPoolAddressByJettonMinters(provider, params) {
    const [jetton0WalletAddress, jetton1WalletAddress] = await Promise.all([
      provider.open(JettonMinter.create(params.token0)).getWalletAddress(this.address),
      provider.open(JettonMinter.create(params.token1)).getWalletAddress(this.address)
    ]);
    const poolAddress = await this.getPoolAddress(provider, {
      token0: jetton0WalletAddress,
      token1: jetton1WalletAddress
    });
    return poolAddress;
  }
  async getPool(provider, params) {
    const poolAddress = await this.getPoolAddressByJettonMinters(
      provider,
      params
    );
    return BasePoolV2.create(poolAddress);
  }
  async getVaultAddress(provider, params) {
    const result = await provider.get("get_vault_address", [
      {
        type: "slice",
        cell: beginCell().storeAddress(toAddress(params.user)).endCell()
      },
      {
        type: "slice",
        cell: beginCell().storeAddress(toAddress(params.tokenWallet)).endCell()
      }
    ]);
    return result.stack.readAddress();
  }
  async getVault(provider, params) {
    const tokenMinter = provider.open(JettonMinter.create(params.tokenMinter));
    const vaultAddress = await this.getVaultAddress(provider, {
      user: params.user,
      tokenWallet: await tokenMinter.getWalletAddress(this.address)
    });
    return VaultV2.create(vaultAddress);
  }
  async getRouterVersion(provider) {
    const result = await provider.get("get_router_version", []);
    return {
      major: result.stack.readNumber(),
      minor: result.stack.readNumber(),
      development: result.stack.readString()
    };
  }
  async getRouterData(provider) {
    const result = await provider.get("get_router_data", []);
    return {
      routerId: result.stack.readNumber(),
      dexType: result.stack.readString(),
      isLocked: result.stack.readBoolean(),
      adminAddress: result.stack.readAddress(),
      tempUpgrade: result.stack.readCell(),
      poolCode: result.stack.readCell(),
      jettonLpWalletCode: result.stack.readCell(),
      lpAccountCode: result.stack.readCell(),
      vaultCode: result.stack.readCell()
    };
  }
};
_BaseRouterV2.version = DEX_VERSION.v2;
_BaseRouterV2.gasConstants = {
  swapJettonToJetton: {
    gasAmount: toNano("0.3"),
    forwardGasAmount: toNano("0.24")
  },
  swapJettonToTon: {
    gasAmount: toNano("0.3"),
    forwardGasAmount: toNano("0.24")
  },
  swapTonToJetton: {
    forwardGasAmount: toNano("0.3")
  },
  provideLpJetton: {
    gasAmount: toNano("0.3"),
    forwardGasAmount: toNano("0.235")
  },
  provideLpTon: {
    forwardGasAmount: toNano("0.3")
  },
  singleSideProvideLpJetton: {
    gasAmount: toNano("1"),
    forwardGasAmount: toNano("0.8")
  },
  singleSideProvideLpTon: {
    forwardGasAmount: toNano("0.8")
  }
};
let BaseRouterV2 = _BaseRouterV2;
export {
  BaseRouterV2
};
//# sourceMappingURL=BaseRouterV2.js.map
