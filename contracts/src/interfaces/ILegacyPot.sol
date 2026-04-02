// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ILegacyPot
/// @notice Interface for the legacy pot that accumulates funds from losing roulette
///         bets and distributes a proportional share to winners.
interface ILegacyPot {
    // ──────────────────────────────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Emitted when funds are deposited into the pot.
    /// @param caller The authorized caller that triggered the deposit.
    /// @param amount The USDC amount deposited (6-decimal).
    event Deposited(address indexed caller, uint256 amount);

    /// @notice Emitted when a winner withdraws their pot share.
    /// @param winner      The address that received the payout.
    /// @param grossAmount The total share before fees.
    /// @param fee         The platform fee deducted.
    /// @param netAmount   The amount actually transferred to the winner.
    event Withdrawn(address indexed winner, uint256 grossAmount, uint256 fee, uint256 netAmount);

    /// @notice Emitted when pot funds are merged from a liquidated table.
    /// @param amount The USDC amount merged into the pot.
    event Merged(uint256 amount);

    /// @notice Emitted when the owner performs an emergency withdrawal.
    /// @param to     The address that received the funds.
    /// @param amount The USDC amount withdrawn.
    event EmergencyWithdrawn(address indexed to, uint256 amount);

    /// @notice Emitted when an authorized caller is added.
    /// @param caller The newly authorized address.
    event AuthorizedCallerAdded(address indexed caller);

    /// @notice Emitted when an authorized caller is removed.
    /// @param caller The address whose authorization was revoked.
    event AuthorizedCallerRemoved(address indexed caller);

    // ──────────────────────────────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Thrown when a non-authorized caller attempts a restricted action.
    error UnauthorizedCaller(address caller);

    /// @notice Thrown when a zero amount is provided.
    error ZeroAmount();

    /// @notice Thrown when a zero address is provided.
    error ZeroAddress();

    /// @notice Thrown when the slot count is invalid (0 or > MAX_SLOTS).
    /// @param slots The invalid slot count provided.
    error InvalidSlots(uint256 slots);

    /// @notice Thrown when the pot has no funds to distribute.
    error EmptyPot();

    /// @notice Thrown when the caller is already authorized.
    /// @param caller The address that is already authorized.
    error AlreadyAuthorized(address caller);

    /// @notice Thrown when the caller is not currently authorized.
    /// @param caller The address that is not authorized.
    error NotAuthorized(address caller);

    /// @notice Thrown when a USDC transfer fails.
    error TransferFailed();

    // ──────────────────────────────────────────────────────────────────────
    //  External / Public Functions
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Deposit USDC into the legacy pot. Only callable by authorized addresses.
    /// @param amount The USDC amount to deposit (6-decimal). Must be > 0.
    function deposit(uint256 amount) external;

    /// @notice Calculate the pot share for a winner based on current filled slots.
    /// @dev    share = totalPot * (MAX_SLOTS - currentSlots) / MAX_SLOTS
    ///         The fewer slots filled, the larger the share.
    /// @param  currentSlots The number of slots currently filled on the table (1..36).
    /// @return share The USDC amount the winner would receive (before fees).
    function calculatePotShare(uint256 currentSlots) external view returns (uint256 share);

    /// @notice Withdraw the winner's pot share. Deducts a 5% platform fee, sends the
    ///         net amount to the winner and the fee to the owner. Remaining pot rolls over.
    /// @param  winner       The address to receive the payout.
    /// @param  currentSlots The number of slots filled at the time of the win (1..36).
    function withdraw(address winner, uint256 currentSlots) external;

    /// @notice Merge funds from a liquidated table into this pot.
    /// @param  amount The USDC amount to merge. Must be > 0.
    function mergeFrom(uint256 amount) external;

    /// @notice Emergency withdrawal of all pot funds to the owner. Owner only.
    function emergencyWithdraw() external;

    /// @notice Grant deposit/withdraw authorization to an address. Owner only.
    /// @param  caller The address to authorize.
    function addAuthorizedCaller(address caller) external;

    /// @notice Revoke deposit/withdraw authorization from an address. Owner only.
    /// @param  caller The address to de-authorize.
    function removeAuthorizedCaller(address caller) external;

    /// @notice Returns the current total pot balance tracked by the contract.
    /// @return The total USDC amount in the pot.
    function totalPot() external view returns (uint256);

    /// @notice Returns whether an address is an authorized caller.
    /// @param  caller The address to check.
    /// @return True if the address is authorized.
    function authorizedCallers(address caller) external view returns (bool);
}
