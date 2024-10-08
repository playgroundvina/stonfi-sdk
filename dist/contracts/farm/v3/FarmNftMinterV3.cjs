"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ton = require("@ton/ton");
const Contract = require("../../core/Contract.cjs");
const JettonMinter = require("../../core/JettonMinter.cjs");
const JettonWallet = require("../../core/JettonWallet.cjs");
const createJettonTransferMessage = require("../../../utils/createJettonTransferMessage.cjs");
const toAddress = require("../../../utils/toAddress.cjs");
const constants = require("../constants.cjs");
const _FarmNftMinterV3 = class _FarmNftMinterV32 extends Contract.Contract {
  constructor(address, { gasConstants, ...options } = {}) {
    super(address, options);
    this.gasConstants = {
      ..._FarmNftMinterV32.gasConstants,
      ...gasConstants
    };
  }
  async createStakeBody(params) {
    return ton.beginCell().storeUint(constants.FARM_OP_CODES.STAKE, 32).storeAddress(
      (params == null ? void 0 : params.ownerAddress) ? toAddress.toAddress(params.ownerAddress) : void 0
    ).endCell();
  }
  /**
   * Build all data required to execute a jetton `stake` transaction
   *
   * @param {Address | string} params.userWalletAddress - User's address
   * @param {Address | string} params.jettonAddress - Jetton address of token to be staked
   * @param {bigint | number} params.jettonAmount - Amount of tokens to be staked (in basic token units)
   * @param {number | undefined} params.poolCount - Optional; Number of deployed farm reward pools; If undefined value will get onchain
   * @param {Address | string} params.ownerAddress - Optional; custom owner of stake; if undefined stake owner is sender address
   * @param {bigint | number | undefined} params.queryId - Optional; query id
   *
   * @returns {SenderArguments} containing all data required to execute a jetton `stake` transaction
   */
  async getStakeTxParams(provider, params) {
    const [jettonWalletAddress, forwardPayload, poolCount] = await Promise.all([
      provider.open(JettonMinter.JettonMinter.create(params.jettonAddress)).getWalletAddress(params.userWalletAddress),
      this.createStakeBody({
        ownerAddress: params.ownerAddress
      }),
      (async () => params.poolCount ?? (await this.getFarmingMinterData(provider)).poolCount)()
    ]);
    const forwardTonAmount = this.gasConstants.stakeFwdBase + this.gasConstants.stakeFwdPerPool * BigInt(poolCount + 1);
    const body = createJettonTransferMessage.createJettonTransferMessage({
      queryId: params.queryId ?? 0,
      amount: params.jettonAmount,
      destination: this.address,
      responseDestination: params.userWalletAddress,
      forwardTonAmount,
      forwardPayload
    });
    const value = forwardTonAmount + this.gasConstants.stake;
    return {
      to: jettonWalletAddress,
      value,
      body
    };
  }
  async sendStake(provider, via, params) {
    const txParams = await this.getStakeTxParams(provider, params);
    return via.send(txParams);
  }
  /**
   * @returns {Address} address of minter for staking jetton that is used for farming
   */
  async getStakingJettonAddress(provider) {
    const { stakingTokenWallet: stakingTokenWalletAddress } = await this.getFarmingMinterData(provider);
    const { jettonMasterAddress } = await provider.open(JettonWallet.JettonWallet.create(stakingTokenWalletAddress)).getWalletData();
    return jettonMasterAddress;
  }
  /**
   * @returns structure containing pending data
   *
   * @property {bigint} changeCustodianTs - Timestamp when 'change_custodian' was initiated
   * @property {bigint} sendMsgTs - Timestamp when 'send_raw_msg' was initiated
   * @property {bigint} codeUpgradeTs - Timestamp when 'code_upgrade' was initiated
   * @property {Address} newCustodian - New custodian that will be set after confirmation
   * @property {Cell} pendingMsg - Pending msg that will be sends after confirmation
   * @property {Cell} newCode - New contract code that will be set after confirmation
   * @property {Cell} newStorage - New contract storage that will be set after confirmation
   */
  async getPendingData(provider) {
    const result = await provider.get("get_pending_data", []);
    return {
      changeCustodianTs: result.stack.readBigNumber(),
      sendMsgTs: result.stack.readBigNumber(),
      codeUpgradeTs: result.stack.readBigNumber(),
      newCustodian: result.stack.readAddressOpt(),
      pendingMsg: result.stack.readCell(),
      newCode: result.stack.readCell(),
      newStorage: result.stack.readCell()
    };
  }
  /**
   * @returns structure containing version data
   *
   * @property {number} major - Major version; breaking changes in api
   * @property {number} minor - Minor version; non-breaking new functionality
   * @property {string} development - Development version; can contain breaking changes
   */
  async getVersion(provider) {
    const result = await provider.get("get_version", []);
    return {
      major: result.stack.readNumber(),
      minor: result.stack.readNumber(),
      development: result.stack.readString()
    };
  }
  /**
   * @returns structure containing current state of the minter
   *
   * @property {bigint} nextItemIndex - Index of the next nft in this collection
   * @property {number} status - Status of the contract: uninitialized `0`, operational `1`, pause_all `2`, frozen `3`, retired `4`,
   * @property {number} poolCount - Pools count
   * @property {bigint} currentStakedTokens - Number of staked tokens in basic token units
   * @property {bigint} contractUniqueId - Minter id
   * @property {bigint} minStakeTime - Minimum staking time
   * @property {Address} stakingTokenWallet - Minter's staking jetton wallet
   * @property {Address} custodianAddress - Custodian address
   * @property {boolean} canChangeCustodian - If can change custodian
   * @property {boolean} canSendRawMsg - If admin can send arbitrary raw msg from Minter
   * @property {Map<number, FarmDataAccrued>} farmDataAccrued - Accrued data for pools
   * @property {Map<number, FarmDataParameters>} farmDataParameters - Pools parameters
   */
  async getFarmingMinterData(provider) {
    const result = await provider.get("get_farming_minter_data", []);
    return {
      nextItemIndex: result.stack.readBigNumber(),
      status: result.stack.readNumber(),
      poolCount: result.stack.readNumber(),
      currentStakedTokens: result.stack.readBigNumber(),
      contractUniqueId: result.stack.readBigNumber(),
      minStakeTime: result.stack.readBigNumber(),
      stakingTokenWallet: result.stack.readAddress(),
      custodianAddress: result.stack.readAddress(),
      canChangeCustodian: result.stack.readBoolean(),
      canSendRawMsg: result.stack.readBoolean(),
      farmDataAccrued: (() => {
        var _a;
        const dict = (_a = result.stack.readCellOpt()) == null ? void 0 : _a.asSlice().loadDictDirect(ton.Dictionary.Keys.Uint(8), ton.Dictionary.Values.Cell());
        const farmDataAccrued = /* @__PURE__ */ new Map();
        if (dict) {
          for (const poolIndex of dict.keys()) {
            const cell = dict.get(poolIndex);
            if (cell === void 0) {
              throw new Error(
                `Failed to parse farmDataAccrued from dict: ${dict}`
              );
            }
            const slice = cell.beginParse();
            const accruedData = {
              depositedNanorewards: slice.loadUintBig(150),
              accruedPerUnitNanorewards: slice.loadUintBig(150),
              accruedFeeNanorewards: slice.loadUintBig(150),
              claimedNanorewards: slice.loadUintBig(150),
              claimedFeeNanorewards: slice.loadUintBig(150),
              accruedNanorewards: slice.loadUintBig(150),
              lastUpdateTime: slice.loadUintBig(64)
            };
            farmDataAccrued.set(poolIndex, accruedData);
          }
        }
        return farmDataAccrued;
      })(),
      farmDataParameters: (() => {
        var _a;
        const dict = (_a = result.stack.readCellOpt()) == null ? void 0 : _a.asSlice().loadDictDirect(ton.Dictionary.Keys.Uint(8), ton.Dictionary.Values.Cell());
        const farmDataParameters = /* @__PURE__ */ new Map();
        if (dict) {
          for (const poolIndex of dict.keys()) {
            const cell = dict.get(poolIndex);
            if (cell === void 0) {
              throw new Error(
                `Failed to parse farmDataParameters from dict: ${dict}`
              );
            }
            const slice = cell.beginParse();
            const parametersData = {
              adminFee: slice.loadUintBig(16),
              nanorewardsPer24h: slice.loadUintBig(150),
              unrestrictedDepositRewards: slice.loadBit(),
              rewardTokenWallet: slice.loadAddress(),
              canChangeFee: slice.loadBit(),
              status: slice.loadUint(8)
            };
            farmDataParameters.set(poolIndex, parametersData);
          }
        }
        return farmDataParameters;
      })()
    };
  }
};
_FarmNftMinterV3.version = constants.FARM_VERSION.v3;
_FarmNftMinterV3.gasConstants = {
  stakeFwdBase: ton.toNano("0.21"),
  stakeFwdPerPool: ton.toNano("0.015"),
  stake: ton.toNano("0.1")
};
let FarmNftMinterV3 = _FarmNftMinterV3;
exports.FarmNftMinterV3 = FarmNftMinterV3;
//# sourceMappingURL=FarmNftMinterV3.cjs.map
