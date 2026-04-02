// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICyberRoulette} from "./interfaces/ICyberRoulette.sol";
import {ILegacyPot} from "./interfaces/ILegacyPot.sol";

/// @title CyberRoulette
/// @author Vegas Protocol
/// @notice Single-zero cyber-themed roulette with shrinking slots, LegacyPot integration,
///         and Chainlink VRF v2.5 randomness.
/// @dev 37 total outcomes per round: numbers 1..currentSlots plus a permanent "0".
///      On loss a slot is removed and funds split 80/15/5 (reserve/LegacyPot/platform).
///      On win the player receives betAmount * currentSlots plus a LegacyPot share, minus 5% fee.
///      On zero the bet is split 50/50 between LegacyPot and platform wallet.
///      All monetary values are USDC (6 decimals). The contract holds a reserve to guarantee
///      payouts and tracks platform fees separately for withdrawal.
contract CyberRoulette is ICyberRoulette, VRFConsumerBaseV2Plus, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────

    /// @notice Maximum number of slots (full board).
    uint8 public constant MAX_SLOTS = 36;

    /// @notice Duration of the seat relay window in seconds.
    uint64 public constant RELAY_WINDOW = 30;

    /// @notice Duration of the L3-priority period within the relay window in seconds.
    uint64 public constant L3_PRIORITY_WINDOW = 5;

    /// @notice Platform fee on win payouts: 5% (500 basis points).
    uint256 public constant WIN_FEE_BPS = 500;

    /// @notice Basis points denominator.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Loss split: 80% to reserve.
    uint256 public constant LOSS_RESERVE_BPS = 8_000;

    /// @notice Loss split: 15% to LegacyPot.
    uint256 public constant LOSS_POT_BPS = 1_500;

    /// @notice Loss split: 5% to platform.
    uint256 public constant LOSS_PLATFORM_BPS = 500;

    /// @notice Zero result split: 50% to LegacyPot, 50% to platform.
    uint256 public constant ZERO_SPLIT_BPS = 5_000;

    // ──────────────────────────────────────────────
    //  Rebalance timeouts by slot range
    // ──────────────────────────────────────────────

    /// @notice Timeout when 20-36 slots remain: 48 hours.
    uint256 public constant TIMEOUT_HIGH = 48 hours;

    /// @notice Timeout when 10-19 slots remain: 12 hours.
    uint256 public constant TIMEOUT_MID = 12 hours;

    /// @notice Timeout when 2-9 slots remain: 1 hour.
    uint256 public constant TIMEOUT_LOW = 1 hours;

    /// @notice Timeout when only 1 slot remains: 15 minutes.
    uint256 public constant TIMEOUT_CRITICAL = 15 minutes;

    // ──────────────────────────────────────────────
    //  Chainlink VRF configuration
    // ──────────────────────────────────────────────

    /// @notice VRF key hash for the target chain.
    bytes32 public immutable s_keyHash;

    /// @notice VRF subscription ID.
    uint256 public immutable s_subscriptionId;

    /// @notice VRF minimum request confirmations.
    uint16 public constant REQUEST_CONFIRMATIONS = 3;

    /// @notice VRF callback gas limit. Sized for the heaviest settlement path (win + LegacyPot withdrawal).
    uint32 public constant CALLBACK_GAS_LIMIT = 500_000;

    /// @notice Number of random words requested per VRF call.
    uint32 public constant NUM_WORDS = 1;

    // ──────────────────────────────────────────────
    //  Immutables
    // ──────────────────────────────────────────────

    /// @notice USDC token contract (6 decimals).
    IERC20 public immutable usdc;

    /// @notice LegacyPot contract for cross-table pot accumulation.
    ILegacyPot public immutable legacyPot;

    // NOTE: `owner()` is provided by VRFConsumerBaseV2Plus -> ConfirmedOwner.
    // No custom owner variable needed.

    // ──────────────────────────────────────────────
    //  State variables
    // ──────────────────────────────────────────────

    /// @notice Current number of active slots (starts at 36, decrements on loss).
    uint8 public currentSlots;

    /// @notice Internal pot balance tracked by this contract (funds pending deposit to LegacyPot
    ///         or not yet deposited due to callback context). This is the local pot accounting.
    uint256 public pot;

    /// @notice Reserve balance (80% of losses). Used to guarantee winner payouts.
    uint256 public reserve;

    /// @notice Accumulated platform fees awaiting withdrawal.
    uint256 public platformBalance;

    /// @notice Timestamp of the most recent bet.
    uint256 public lastBetTimestamp;

    /// @notice Whether the game is paused.
    bool public gamePaused;

    /// @notice The player currently seated at the table.
    address public currentPlayer;

    /// @notice Active seat relay state.
    SeatRelay public seatRelay;

    /// @notice Mapping of VRF requestId to Bet.
    mapping(uint256 => Bet) internal _bets;

    /// @notice Whether a player has an unsettled bet.
    mapping(address => bool) public hasPendingBet;

    /// @notice L3 subscriber status for priority seat claiming.
    mapping(address => bool) public isL3Subscriber;

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    // NOTE: `onlyOwner` modifier is inherited from VRFConsumerBaseV2Plus -> ConfirmedOwner.

    /// @dev Reverts if the game is paused.
    modifier whenNotPaused() {
        if (gamePaused) revert GamePaused();
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /// @notice Deploy a new CyberRoulette table.
    /// @param _usdc USDC token address (must be non-zero).
    /// @param _legacyPot LegacyPot contract address (must be non-zero).
    /// @param _vrfCoordinator Chainlink VRF Coordinator address.
    /// @param _subscriptionId Chainlink VRF subscription ID.
    /// @param _keyHash Chainlink VRF key hash for the target chain.
    constructor(
        address _usdc,
        address _legacyPot,
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_legacyPot == address(0)) revert ZeroAddress();

        usdc = IERC20(_usdc);
        legacyPot = ILegacyPot(_legacyPot);

        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;

        currentSlots = MAX_SLOTS;
        lastBetTimestamp = block.timestamp;
    }

    // ──────────────────────────────────────────────
    //  Player Functions
    // ──────────────────────────────────────────────

    /// @inheritdoc ICyberRoulette
    function placeBet(
        uint8 number,
        uint128 amount
    ) external nonReentrant whenNotPaused returns (uint256 requestId) {
        // --- Checks ---
        if (amount == 0) revert ZeroBetAmount();
        if (currentSlots <= 1) revert GameRoundEnded();
        if (number == 0 || number > currentSlots) {
            revert InvalidNumber(number, currentSlots);
        }

        uint256 maxBet = getMaxBet();
        if (amount > maxBet) revert BetTooLarge(amount, maxBet);
        if (hasPendingBet[msg.sender]) revert BetAlreadyPending();

        // --- Effects ---
        hasPendingBet[msg.sender] = true;
        lastBetTimestamp = block.timestamp;

        // If seat is empty or relay expired, claim it implicitly
        if (currentPlayer == address(0)) {
            currentPlayer = msg.sender;
        }

        // --- Interaction: pull USDC from player ---
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // --- Request VRF randomness ---
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        _bets[requestId] = Bet({
            player: msg.sender,
            amount: amount,
            number: number,
            settled: false
        });

        emit BetPlaced(requestId, msg.sender, amount, number);
        emit LastBetTimestampUpdated(block.timestamp);
    }

    /// @inheritdoc ICyberRoulette
    function abandonSeat() external {
        if (msg.sender != currentPlayer) revert Unauthorized();
        if (hasPendingBet[msg.sender]) revert BetAlreadyPending();

        currentPlayer = address(0);
        seatRelay = SeatRelay({
            abandonedAt: uint64(block.timestamp),
            active: true
        });

        emit SeatAbandoned(msg.sender, uint64(block.timestamp));
    }

    /// @inheritdoc ICyberRoulette
    function claimSeat() external whenNotPaused {
        SeatRelay memory relay = seatRelay;
        if (!relay.active) revert NoActiveRelay();

        uint64 elapsed = uint64(block.timestamp) - relay.abandonedAt;
        if (elapsed > RELAY_WINDOW) revert RelayWindowExpired();

        // First 5 seconds: L3 subscribers only
        if (elapsed < L3_PRIORITY_WINDOW && !isL3Subscriber[msg.sender]) {
            revert L3OnlyPeriod();
        }

        currentPlayer = msg.sender;
        seatRelay.active = false;

        emit SeatClaimed(msg.sender, isL3Subscriber[msg.sender]);
    }

    // ──────────────────────────────────────────────
    //  VRF Callback
    // ──────────────────────────────────────────────

    /// @notice Chainlink VRF callback -- settles the bet.
    /// @dev Called by the VRF Coordinator. Must not revert under normal conditions.
    ///      The random result maps to [0, currentSlots] giving 37 initial outcomes
    ///      (one for each number plus the permanent zero).
    /// @param requestId The VRF request ID.
    /// @param randomWords The array of random words (we use index 0).
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        Bet storage bet = _bets[requestId];
        if (bet.player == address(0)) return; // Unknown request -- ignore
        if (bet.settled) return; // Already settled -- ignore

        bet.settled = true;
        hasPendingBet[bet.player] = false;

        // Random result in [0, currentSlots]:
        // currentSlots + 1 possible outcomes: 0, 1, 2, ..., currentSlots
        uint8 slots = currentSlots;
        uint8 result = uint8(randomWords[0] % (uint256(slots) + 1));

        if (result == 0) {
            _settleZero(requestId, bet);
        } else if (result == bet.number) {
            _settleWin(requestId, bet, result, slots);
        } else {
            _settleLoss(requestId, bet, result, slots);
        }
    }

    // ──────────────────────────────────────────────
    //  Internal Settlement
    // ──────────────────────────────────────────────

    /// @dev Handle zero result: 50% deposited to LegacyPot, 50% to platform balance.
    ///      Slots remain unchanged. The player loses their entire bet.
    /// @param requestId The VRF request ID for event emission.
    /// @param bet The bet being settled.
    function _settleZero(uint256 requestId, Bet storage bet) internal {
        uint256 amount = bet.amount;
        uint256 toPot = (amount * ZERO_SPLIT_BPS) / BPS_DENOMINATOR;
        uint256 toPlatform = amount - toPot; // Remainder avoids rounding dust

        // Effects: track platform fees locally; pot portion goes to LegacyPot
        platformBalance += toPlatform;

        emit Zero(requestId, bet.player, amount, toPot, toPlatform);

        // Interaction: deposit 50% to LegacyPot
        // Approve LegacyPot to pull USDC from this contract
        if (toPot > 0) {
            usdc.forceApprove(address(legacyPot), toPot);
            legacyPot.deposit(toPot);
        }
    }

    /// @dev Handle win: payout = betAmount * currentSlots + potShare from LegacyPot.
    ///      A 5% platform fee is deducted from the total gross payout. Slots reset to 36.
    ///      The base prize (betAmount * slots) is funded from the player's bet + reserve.
    /// @param requestId The VRF request ID for event emission.
    /// @param bet The bet being settled.
    /// @param result The winning number (matches bet.number).
    /// @param slots The current slot count at time of settlement.
    function _settleWin(
        uint256 requestId,
        Bet storage bet,
        uint8 result,
        uint8 slots
    ) internal {
        uint256 amount = bet.amount;
        address player = bet.player;

        // Base prize from the bet multiplier: betAmount * currentSlots
        // The player's original bet is already in the contract, so the reserve
        // must cover (betAmount * slots - betAmount) = betAmount * (slots - 1).
        uint256 basePrize = uint256(amount) * uint256(slots);

        // Deduct from reserve what we owe beyond the original bet amount.
        // The bet amount itself is already held by the contract from the transfer in placeBet.
        uint256 reserveCost = basePrize - amount; // Always >= 0 since slots >= 2
        if (reserveCost > reserve) {
            // Safety cap: should not happen if maxBet is enforced correctly
            reserveCost = reserve;
        }
        reserve -= reserveCost;

        // Request pot share from LegacyPot: totalPot * (36 - currentSlots) / 36.
        // LegacyPot.withdraw sends the net share (after its own 5% fee) directly to the winner.
        // We call it with currentSlots so the pot formula is computed inside LegacyPot.
        // NOTE: LegacyPot deducts its own 5% fee internally. The pot share we track here
        // is the gross share for event emission; the net amount goes to the player directly
        // from LegacyPot.
        uint256 potShareGross = _calculateLocalPotShare(slots);

        // Reset slots to 36 before external calls (checks-effects-interactions)
        currentSlots = MAX_SLOTS;

        // 5% platform fee on the base prize only (pot share fee is handled by LegacyPot)
        uint256 fee = (basePrize * WIN_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netBasePrize = basePrize - fee;
        platformBalance += fee;

        emit PotDistributed(potShareGross, 0);
        emit Win(requestId, player, netBasePrize, result, MAX_SLOTS);

        // Interactions: send base prize (minus fee) to the player
        if (netBasePrize > 0) {
            usdc.safeTransfer(player, netBasePrize);
        }

        // Request LegacyPot to pay the winner their pot share directly.
        // LegacyPot.withdraw(winner, currentSlots) handles the transfer.
        // We pass the pre-reset slot count so the pot share formula is correct.
        // LegacyPot deducts its own 5% fee and sends the net to the winner.
        if (potShareGross > 0) {
            legacyPot.withdraw(player, uint256(slots));
        }
    }

    /// @dev Handle loss: one slot removed, funds split 80% reserve / 15% LegacyPot / 5% platform.
    /// @param requestId The VRF request ID for event emission.
    /// @param bet The bet being settled.
    /// @param result The random result number (not the player's chosen number).
    /// @param slots The current slot count at time of settlement.
    function _settleLoss(
        uint256 requestId,
        Bet storage bet,
        uint8 result,
        uint8 slots
    ) internal {
        uint256 amount = bet.amount;

        uint256 toReserve = (amount * LOSS_RESERVE_BPS) / BPS_DENOMINATOR;
        uint256 toPot = (amount * LOSS_POT_BPS) / BPS_DENOMINATOR;
        uint256 toPlatform = amount - toReserve - toPot; // Remainder to avoid rounding dust

        // Effects
        reserve += toReserve;
        platformBalance += toPlatform;

        // Remove one slot
        uint8 newSlots = slots - 1;
        currentSlots = newSlots;

        emit Loss(requestId, bet.player, amount, result, newSlots);

        // Interaction: deposit 15% to LegacyPot
        if (toPot > 0) {
            usdc.forceApprove(address(legacyPot), toPot);
            legacyPot.deposit(toPot);
        }
    }

    // ──────────────────────────────────────────────
    //  Rebalance (Liquidation)
    // ──────────────────────────────────────────────

    /// @inheritdoc ICyberRoulette
    /// @dev Liquidation triggered when the table has been idle past its timeout threshold.
    ///      50% of reserve goes to owner, 50% to target table (or to LegacyPot via mergeFrom
    ///      if target is address(0)). Slots reset to 36 after rebalance.
    function rebalance(address target) external nonReentrant onlyOwner {
        uint8 slots = currentSlots;
        if (slots == MAX_SLOTS) revert SlotsFullNoRebalance();
        if (reserve == 0) revert NoReserveToRebalance();

        uint256 timeout = _getRebalanceTimeout(slots);
        uint256 requiredTime = lastBetTimestamp + timeout;
        if (block.timestamp < requiredTime) {
            revert RebalanceNotReady(requiredTime, block.timestamp);
        }

        uint256 totalReserve = reserve;
        uint256 toOwner = totalReserve / 2;
        uint256 toTarget = totalReserve - toOwner; // Remainder avoids rounding dust

        // Effects
        reserve = 0;
        currentSlots = MAX_SLOTS;
        currentPlayer = address(0);

        emit Rebalanced(msg.sender, toOwner, toTarget, slots);

        // Interactions: send 50% to owner
        if (toOwner > 0) {
            usdc.safeTransfer(owner(), toOwner);
        }

        // Send remaining to target table, or merge into LegacyPot if no target
        if (target != address(0) && toTarget > 0) {
            usdc.safeTransfer(target, toTarget);
        } else if (toTarget > 0) {
            // No target specified: merge into LegacyPot for the ecosystem
            usdc.forceApprove(address(legacyPot), toTarget);
            legacyPot.mergeFrom(toTarget);
        }
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /// @inheritdoc ICyberRoulette
    function setL3Subscriber(address subscriber, bool status) external onlyOwner {
        if (subscriber == address(0)) revert ZeroAddress();
        isL3Subscriber[subscriber] = status;
        emit L3SubscriberUpdated(subscriber, status);
    }

    /// @inheritdoc ICyberRoulette
    function batchSetL3Subscribers(
        address[] calldata subscribers,
        bool status
    ) external onlyOwner {
        uint256 len = subscribers.length;
        for (uint256 i; i < len;) {
            address sub = subscribers[i];
            if (sub == address(0)) revert ZeroAddress();
            isL3Subscriber[sub] = status;
            emit L3SubscriberUpdated(sub, status);
            unchecked {
                ++i;
            }
        }
    }

    /// @inheritdoc ICyberRoulette
    function withdrawPlatformFees(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = platformBalance;
        if (amount == 0) revert ZeroBetAmount();

        platformBalance = 0;

        usdc.safeTransfer(to, amount);
    }

    /// @inheritdoc ICyberRoulette
    function setGamePaused(bool _paused) external onlyOwner {
        gamePaused = _paused;
        emit GamePauseToggled(_paused);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @inheritdoc ICyberRoulette
    /// @dev maxBet = (reserve * 80) / (currentSlots * 100) = (reserve * 4) / (currentSlots * 5).
    ///      This ensures the contract can always cover the maximum possible win payout
    ///      (betAmount * currentSlots) from the reserve.
    function getMaxBet() public view returns (uint256) {
        uint8 slots = currentSlots;
        if (slots == 0) return 0;
        return (reserve * 4) / (uint256(slots) * 5);
    }

    /// @inheritdoc ICyberRoulette
    /// @dev Returns the local pot share estimate: pot * (36 - currentSlots) / 36.
    ///      The actual pot share is computed by LegacyPot on withdrawal.
    function getPotShare() public view returns (uint256) {
        return _calculateLocalPotShare(currentSlots);
    }

    /// @inheritdoc ICyberRoulette
    function getRebalanceTimeout() external view returns (uint256) {
        return _getRebalanceTimeout(currentSlots);
    }

    /// @inheritdoc ICyberRoulette
    function getBet(uint256 requestId) external view returns (Bet memory) {
        return _bets[requestId];
    }

    /// @inheritdoc ICyberRoulette
    function seatOpen() external view returns (bool) {
        return currentPlayer == address(0) || seatRelay.active;
    }

    /// @inheritdoc ICyberRoulette
    /// @dev Returns the total USDC balance held by this contract (reserve + platform + unaccounted).
    function potBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    // ──────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────

    /// @dev Calculate local pot share: pot * (MAX_SLOTS - slots) / MAX_SLOTS.
    ///      Returns 0 when slots == MAX_SLOTS (all 36 filled -- no payout).
    /// @param slots Current number of active slots.
    /// @return share The local pot share amount (used for event estimation only).
    function _calculateLocalPotShare(uint8 slots) internal view returns (uint256 share) {
        if (slots >= MAX_SLOTS) return 0;
        share = (pot * uint256(MAX_SLOTS - slots)) / uint256(MAX_SLOTS);
    }

    /// @dev Get the rebalance timeout based on slot count.
    /// @param slots Current number of active slots.
    /// @return timeout The timeout duration in seconds.
    function _getRebalanceTimeout(uint8 slots) internal pure returns (uint256 timeout) {
        if (slots >= 20) {
            timeout = TIMEOUT_HIGH; // 36-20 slots: 48 hours
        } else if (slots >= 10) {
            timeout = TIMEOUT_MID; // 19-10 slots: 12 hours
        } else if (slots >= 2) {
            timeout = TIMEOUT_LOW; // 9-2 slots: 1 hour
        } else {
            timeout = TIMEOUT_CRITICAL; // 1 slot: 15 minutes
        }
    }

    // ──────────────────────────────────────────────
    //  Fund Seeding (Bootstrap)
    // ──────────────────────────────────────────────

    /// @notice Seed the reserve with initial USDC (owner only, for bootstrapping a new table).
    /// @param amount USDC amount to add to the reserve.
    function seedReserve(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroBetAmount();
        reserve += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Seed the local pot with initial USDC (owner only, for bootstrapping).
    /// @param amount USDC amount to add to the local pot.
    function seedPot(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroBetAmount();
        pot += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }
}
