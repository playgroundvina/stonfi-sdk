"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ton = require("@ton/ton");
const Contract = require("../../core/Contract.cjs");
const createSbtDestroyMessage = require("../../../utils/createSbtDestroyMessage.cjs");
const constants = require("../constants.cjs");
const FarmNftMinterV3 = require("./FarmNftMinterV3.cjs");
const _FarmNftItemV3 = class _FarmNftItemV32 extends Contract.Contract {
  constructor(address, { gasConstants, ...options } = {}) {
    super(address, options);
    this.gasConstants = {
      ..._FarmNftItemV32.gasConstants,
      ...gasConstants
    };
  }
  async createClaimRewardsBody(params) {
    const builder = ton.beginCell();
    builder.storeUint(constants.FARM_OP_CODES.CLAIM_REWARDS, 32);
    builder.storeUint(params.queryId ?? 0, 64);
    if (params.claimAll) {
      builder.storeUint(1, 1);
      builder.storeUint(0, 8);
    } else {
      builder.storeUint(0, 1);
      builder.storeUint(params.poolIndex, 8);
    }
    return builder.endCell();
  }
  /**
   * Build all data required to execute a `claim_rewards` transaction.
   *
   * @param {number | undefined} params.poolCount - Optional; Number of deployed farm reward pools; If undefined value will get onchain
   * @param {number | undefined} params.poolIndex - Optional; farm reward pool index used for claiming; If undefined claim rewards from all pools
   * @param {bigint | number | undefined} params.queryId - Optional; query id
   *
   * @returns {SenderArguments} all data required to execute a `claim_rewards` transaction.
   */
  async getClaimRewardsTxParams(provider, params) {
    const to = this.address;
    const body = await this.createClaimRewardsBody({
      queryId: params == null ? void 0 : params.queryId,
      claimAll: (params == null ? void 0 : params.poolIndex) === void 0,
      poolIndex: (params == null ? void 0 : params.poolIndex) ?? 0
    });
    const poolCount = (params == null ? void 0 : params.poolCount) ?? await this.getPoolCount(provider);
    const value = this.gasConstants.claimRewardsBase + this.gasConstants.claimRewardsPerPool * BigInt(poolCount - 1);
    return { to, value, body };
  }
  async sendClaimRewards(provider, via, params) {
    const txParams = await this.getClaimRewardsTxParams(provider, params);
    return via.send(txParams);
  }
  async createUnstakeBody(params) {
    return ton.beginCell().storeUint(constants.FARM_OP_CODES.UNSTAKE, 32).storeUint((params == null ? void 0 : params.queryId) ?? 0, 64).endCell();
  }
  /**
   * Build all data required to execute a `unstake` transaction.
   *
   * @param {number | undefined} params.poolCount -  Optional; Number of deployed farm reward pools; If undefined value will get onchain
   * @param {bigint | number | undefined} params.queryId - Optional; query id
   *
   * @returns {SenderArguments} all data required to execute a `unstake` transaction.
   */
  async getUnstakeTxParams(provider, params) {
    const to = this.address;
    const body = await this.createUnstakeBody({
      queryId: params == null ? void 0 : params.queryId
    });
    const poolCount = (params == null ? void 0 : params.poolCount) ?? await this.getPoolCount(provider);
    const value = this.gasConstants.unstakeBase + this.gasConstants.unstakePerPool * BigInt(poolCount - 1);
    return { to, value, body };
  }
  async sendUnstake(provider, via, params) {
    const txParams = await this.getUnstakeTxParams(provider, params);
    return via.send(txParams);
  }
  async createDestroyBody(params) {
    return createSbtDestroyMessage.createSbtDestroyMessage({
      queryId: (params == null ? void 0 : params.queryId) ?? 0
    });
  }
  /**
   * Build all data required to execute a `destroy` transaction.
   *
   * @param {bigint | string | number | undefined} params.queryId - Optional; query id
   *
   * @returns {SenderArguments} all data required to execute a `destroy` transaction.
   */
  async getDestroyTxParams(provider, params) {
    const to = this.address;
    const body = await this.createDestroyBody({
      queryId: params == null ? void 0 : params.queryId
    });
    const value = this.gasConstants.destroy;
    return { to, value, body };
  }
  async sendDestroy(provider, via, params) {
    const txParams = await this.getDestroyTxParams(provider, params);
    return via.send(txParams);
  }
  /**
   * @returns structure containing current state of the farm NFT
   *
   * @property {number} status Status of the contract: uninitialized (0), active (1), unstaked (2), claiming (3), unstaked_pending (4)
   * @property {bigint} revokeTime Timestamp of unstake
   * @property {bigint} stakedTokens Amount of staked tokens
   * @property {bigint} stakeDate Timestamp in which the owner started staking
   * @property {Map<number, bigint>} claimedPerUnit `accrued_per_unit_nanorewards amounts` for each pool at the time of last claim for this user
   * @property {Address} ownerAddress Owner address of farm nft
   */
  async getFarmingData(provider) {
    const result = await provider.get("get_farming_data", []);
    return {
      status: result.stack.readNumber(),
      revokeTime: result.stack.readBigNumber(),
      stakedTokens: result.stack.readBigNumber(),
      stakeDate: result.stack.readBigNumber(),
      claimedPerUnit: (() => {
        var _a;
        const dict = (_a = result.stack.readCellOpt()) == null ? void 0 : _a.asSlice().loadDictDirect(
          ton.Dictionary.Keys.Uint(8),
          ton.Dictionary.Values.BigUint(150)
        );
        const claimedPerUnit = /* @__PURE__ */ new Map();
        if (dict) {
          for (const poolIndex of dict.keys()) {
            const accruedPerUnitNanorewards = dict.get(poolIndex);
            if (accruedPerUnitNanorewards === void 0) {
              throw new Error(
                `Failed to parse claimedPerUnit from dict: ${dict}`
              );
            }
            claimedPerUnit.set(Number(poolIndex), accruedPerUnitNanorewards);
          }
        }
        return claimedPerUnit;
      })(),
      ownerAddress: result.stack.readAddress()
    };
  }
  async getPoolCount(provider) {
    const result = await provider.get("get_nft_data", []);
    const nftItemData = {
      isInitialized: result.stack.readBoolean(),
      index: result.stack.readNumber(),
      minterAddress: result.stack.readAddress()
    };
    const { poolCount } = await provider.open(FarmNftMinterV3.FarmNftMinterV3.create(nftItemData.minterAddress)).getFarmingMinterData();
    return poolCount;
  }
};
_FarmNftItemV3.version = constants.FARM_VERSION.v3;
_FarmNftItemV3.gasConstants = {
  claimRewardsBase: ton.toNano("0.35"),
  claimRewardsPerPool: ton.toNano("0.13"),
  unstakeBase: ton.toNano("0.45"),
  unstakePerPool: ton.toNano("0.13"),
  destroy: ton.toNano("0.05")
};
let FarmNftItemV3 = _FarmNftItemV3;
exports.FarmNftItemV3 = FarmNftItemV3;
//# sourceMappingURL=FarmNftItemV3.cjs.map
