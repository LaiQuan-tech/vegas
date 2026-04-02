// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ICyberRoulette
/// @notice Interface for the CyberRoulette game contract
/// @dev Cyber-themed roulette with shrinking slots, pot accumulation, and Chainlink VRF.
///      37 total outcomes: numbers 1-36 (shrinks as players lose) plus a permanent "0".
interface ICyberRoulette {
    // ──────────────────────────────────────────────
    //  Structs
    // ──────────────────────────────────────────────

    /// @notice A pending bet awaiting VRF fulfillment
    struct Bet {
        address player;
        uint128 amount;
        uint8 number;
        bool settled;
    }

    /// @notice Seat relay state for the 30-second claim window
    struct SeatRelay {
        uint64 abandonedAt;
        bool active;
    }

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a player places a bet
    /// @param requestId The Chainlink VRF request ID
    /// @param player The player address
    /// @param amount The bet amount in USDC
    /// @param number The chosen number (1 to currentSlots)
    event BetPlaced(
        uint256 indexed requestId,
        address indexed player,
        uint256 amount,
        uint8 number
    );

    /// @notice Emitted when a bet is resolved as a win
    /// @param requestId The VRF request ID
    /// @param player The winner address
    /// @param payout Net payout sent to the player (after 5% fee)
    /// @param result The winning number
    /// @param slotsReset Slots reset back to 36
    event Win(
        uint256 indexed requestId,
        address indexed player,
        uint256 payout,
        uint8 result,
        uint8 slotsReset
    );

    /// @notice Emitted when the VRF result is zero
    /// @param requestId The VRF request ID
    /// @param player The player address
    /// @param betAmount The bet amount lost
    /// @param toPot Amount added to the pot
    /// @param toPlatform Amount added to platform fees
    event Zero(
        uint256 indexed requestId,
        address indexed player,
        uint256 betAmount,
        uint256 toPot,
        uint256 toPlatform
    );

    /// @notice Emitted when a bet is resolved as a loss (non-zero, non-win)
    /// @param requestId The VRF request ID
    /// @param player The player address
    /// @param betAmount The bet amount lost
    /// @param result The random result number
    /// @param newSlots Slot count after one slot is removed
    event Loss(
        uint256 indexed requestId,
        address indexed player,
        uint256 betAmount,
        uint8 result,
        uint8 newSlots
    );

    /// @notice Emitted when a seat is abandoned for relay
    /// @param abandonedBy The address that abandoned the seat
    /// @param abandonedAt Timestamp of abandonment
    event SeatAbandoned(address indexed abandonedBy, uint64 abandonedAt);

    /// @notice Emitted when a seat is claimed during the relay window
    /// @param claimedBy The address that claimed the seat
    /// @param wasL3 Whether the claimer is an L3 subscriber
    event SeatClaimed(address indexed claimedBy, bool wasL3);

    /// @notice Emitted when rebalance (liquidation) is triggered
    /// @param caller The address that triggered rebalance
    /// @param toOwner Amount sent to the owner
    /// @param toTarget Amount sent to the target address
    /// @param slotsAtRebalance Slot count at time of rebalance
    event Rebalanced(
        address indexed caller,
        uint256 toOwner,
        uint256 toTarget,
        uint8 slotsAtRebalance
    );

    /// @notice Emitted when pot funds are distributed on a win
    /// @param potSharePaid Amount of pot distributed to winner
    /// @param potRemaining Remaining pot balance after distribution
    event PotDistributed(uint256 potSharePaid, uint256 potRemaining);

    /// @notice Emitted when an L3 subscriber status is updated
    /// @param subscriber The subscriber address
    /// @param status New subscription status
    event L3SubscriberUpdated(address indexed subscriber, bool status);

    /// @notice Emitted when the game is paused or unpaused
    /// @param paused New pause state
    event GamePauseToggled(bool paused);

    /// @notice Emitted when the last bet timestamp is updated
    /// @param timestamp The new last bet timestamp
    event LastBetTimestampUpdated(uint256 timestamp);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    /// @notice Bet amount is zero
    error ZeroBetAmount();

    /// @notice Bet exceeds the maximum allowed
    /// @param sent The amount sent
    /// @param maxAllowed The maximum allowed bet
    error BetTooLarge(uint256 sent, uint256 maxAllowed);

    /// @notice Chosen number is outside the valid range [1, currentSlots]
    /// @param chosen The chosen number
    /// @param maxSlot The current maximum slot number
    error InvalidNumber(uint8 chosen, uint8 maxSlot);

    /// @notice Game is currently paused
    error GamePaused();

    /// @notice Player already has a pending bet
    error BetAlreadyPending();

    /// @notice No active seat relay in progress
    error NoActiveRelay();

    /// @notice The 30-second relay window has expired
    error RelayWindowExpired();

    /// @notice L3-only period (first 5 seconds) is still active
    error L3OnlyPeriod();

    /// @notice Rebalance timeout has not yet elapsed
    /// @param requiredTime The earliest allowed rebalance timestamp
    /// @param currentTime The current block timestamp
    error RebalanceNotReady(uint256 requiredTime, uint256 currentTime);

    /// @notice Cannot rebalance when all 36 slots are active
    error SlotsFullNoRebalance();

    /// @notice USDC transfer failed
    error TransferFailed();

    /// @notice Caller is not authorized for this action
    error Unauthorized();

    /// @notice Reserve is empty, nothing to rebalance
    error NoReserveToRebalance();

    /// @notice Only 1 slot remains — no more bets allowed until reset
    error GameRoundEnded();

    // NOTE: ZeroAddress error is inherited from VRFConsumerBaseV2Plus (IVRFMigratableConsumerV2Plus).

    // ──────────────────────────────────────────────
    //  Player Functions
    // ──────────────────────────────────────────────

    /// @notice Place a bet on a number
    /// @param number The chosen number (1 to currentSlots)
    /// @param amount The USDC amount to wager
    /// @return requestId The Chainlink VRF request ID
    function placeBet(uint8 number, uint128 amount) external returns (uint256 requestId);

    /// @notice Abandon the current seat, starting the 30-second relay window
    function abandonSeat() external;

    /// @notice Claim the seat during the relay window
    /// @dev First 5 seconds are reserved for L3 subscribers only
    function claimSeat() external;

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @notice Get the current number of active slots
    /// @return The current slot count (1-36)
    function currentSlots() external view returns (uint8);

    /// @notice Get the current pot balance
    /// @return The pot balance in USDC (6 decimals)
    function pot() external view returns (uint256);

    /// @notice Get the current reserve balance
    /// @return The reserve balance in USDC (6 decimals)
    function reserve() external view returns (uint256);

    /// @notice Get the accumulated platform fee balance
    /// @return The platform fee balance in USDC (6 decimals)
    function platformBalance() external view returns (uint256);

    /// @notice Calculate the maximum allowed bet based on current reserve and slots
    /// @return The max bet in USDC (6 decimals)
    function getMaxBet() external view returns (uint256);

    /// @notice Calculate the pot share that would be paid on a win at current slot count
    /// @return The pot share in USDC (6 decimals)
    function getPotShare() external view returns (uint256);

    /// @notice Get the rebalance timeout for the current slot count
    /// @return The timeout duration in seconds
    function getRebalanceTimeout() external view returns (uint256);

    /// @notice Get bet details for a VRF request ID
    /// @param requestId The VRF request ID
    /// @return The Bet struct
    function getBet(uint256 requestId) external view returns (Bet memory);

    /// @notice Check if an address has L3 subscriber status
    /// @param account The address to check
    /// @return True if the address is an L3 subscriber
    function isL3Subscriber(address account) external view returns (bool);

    /// @notice Get the address of the player currently seated
    /// @return The current player address (address(0) if empty)
    function currentPlayer() external view returns (address);

    /// @notice Get the timestamp of the most recent bet
    /// @return The last bet timestamp
    function lastBetTimestamp() external view returns (uint256);

    /// @notice Returns true if the table has an open seat
    /// @return True if no player is seated or relay is active
    function seatOpen() external view returns (bool);

    /// @notice Returns the USDC balance held by this contract
    /// @return The total USDC balance of the contract
    function potBalance() external view returns (uint256);

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /// @notice Set L3 subscriber status for an address
    /// @param subscriber The address to update
    /// @param status True to grant L3 status, false to revoke
    function setL3Subscriber(address subscriber, bool status) external;

    /// @notice Batch set L3 subscriber status for multiple addresses
    /// @param subscribers Array of addresses to update
    /// @param status True to grant, false to revoke
    function batchSetL3Subscribers(address[] calldata subscribers, bool status) external;

    /// @notice Trigger rebalance (liquidation) after timeout
    /// @param target Address to receive the non-owner portion (address(0) keeps funds in contract)
    function rebalance(address target) external;

    /// @notice Withdraw accumulated platform fees to a recipient
    /// @param to Recipient address
    function withdrawPlatformFees(address to) external;

    /// @notice Pause or unpause the game
    /// @param paused True to pause, false to unpause
    function setGamePaused(bool paused) external;
}
