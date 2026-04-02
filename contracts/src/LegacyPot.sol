// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ILegacyPot} from "./interfaces/ILegacyPot.sol";

/// @title LegacyPot
/// @author Vegas Protocol
/// @notice Accumulates USDC from losing roulette bets and distributes a proportional
///         share to winners. The share scales inversely with filled slots — fewer slots
///         filled means a larger legacy pot payout. A 5% platform fee is deducted on
///         every withdrawal; the remainder rolls over for the next winner.
/// @dev    All USDC amounts use 6 decimals. The contract never holds native ETH.
///         Authorization is managed via a whitelist of caller addresses (game tables).
contract LegacyPot is ILegacyPot, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Maximum number of slots on a roulette table.
    uint256 public constant MAX_SLOTS = 36;

    /// @notice Platform fee in basis points (500 = 5%).
    uint256 public constant PLATFORM_FEE_BPS = 500;

    /// @notice Basis-point denominator.
    uint256 private constant BPS_DENOMINATOR = 10_000;

    // ──────────────────────────────────────────────────────────────────────
    //  Immutables
    // ──────────────────────────────────────────────────────────────────────

    /// @notice The USDC token used for all pot operations.
    IERC20 public immutable usdc;

    // ──────────────────────────────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Running total of USDC held in the pot.
    uint256 public totalPot;

    /// @notice Whitelist of addresses allowed to call `deposit` and `withdraw`.
    mapping(address => bool) public authorizedCallers;

    // ──────────────────────────────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────────────────────────────

    /// @dev Reverts if the caller is not in the authorized whitelist.
    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender]) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────────────────────────────

    /// @param usdc_  The USDC token address (must be non-zero).
    /// @param owner_ The initial owner who can manage callers and perform emergency actions.
    constructor(address usdc_, address owner_) Ownable(owner_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        if (owner_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  External — Authorized Callers
    // ──────────────────────────────────────────────────────────────────────

    /// @inheritdoc ILegacyPot
    function deposit(uint256 amount) external onlyAuthorized nonReentrant {
        if (amount == 0) revert ZeroAmount();

        // Effects
        totalPot += amount;

        emit Deposited(msg.sender, amount);

        // Interaction — SafeERC20 reverts on failure
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @inheritdoc ILegacyPot
    function withdraw(
        address winner,
        uint256 currentSlots
    ) external onlyAuthorized nonReentrant {
        if (winner == address(0)) revert ZeroAddress();
        if (currentSlots == 0 || currentSlots > MAX_SLOTS) {
            revert InvalidSlots(currentSlots);
        }
        if (totalPot == 0) revert EmptyPot();

        // Calculate gross share: totalPot * (36 - currentSlots) / 36
        uint256 grossShare = _calculatePotShare(currentSlots);
        if (grossShare == 0) revert EmptyPot();

        // Calculate fee and net payout
        uint256 fee = (grossShare * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netPayout = grossShare - fee;

        // Effects — deduct gross share; remainder stays in the pot
        totalPot -= grossShare;

        emit Withdrawn(winner, grossShare, fee, netPayout);

        // Interactions — transfers last (checks-effects-interactions)
        if (netPayout > 0) {
            usdc.safeTransfer(winner, netPayout);
        }
        if (fee > 0) {
            usdc.safeTransfer(owner(), fee);
        }
    }

    /// @inheritdoc ILegacyPot
    function mergeFrom(uint256 amount) external onlyAuthorized nonReentrant {
        if (amount == 0) revert ZeroAmount();

        // Effects
        totalPot += amount;

        emit Merged(amount);

        // Interaction
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  External — View
    // ──────────────────────────────────────────────────────────────────────

    /// @inheritdoc ILegacyPot
    function calculatePotShare(
        uint256 currentSlots
    ) external view returns (uint256 share) {
        if (currentSlots == 0 || currentSlots > MAX_SLOTS) {
            revert InvalidSlots(currentSlots);
        }
        share = _calculatePotShare(currentSlots);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  External — Owner
    // ──────────────────────────────────────────────────────────────────────

    /// @inheritdoc ILegacyPot
    function addAuthorizedCaller(address caller) external onlyOwner {
        if (caller == address(0)) revert ZeroAddress();
        if (authorizedCallers[caller]) revert AlreadyAuthorized(caller);

        authorizedCallers[caller] = true;

        emit AuthorizedCallerAdded(caller);
    }

    /// @inheritdoc ILegacyPot
    function removeAuthorizedCaller(address caller) external onlyOwner {
        if (!authorizedCallers[caller]) revert NotAuthorized(caller);

        authorizedCallers[caller] = false;

        emit AuthorizedCallerRemoved(caller);
    }

    /// @inheritdoc ILegacyPot
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 amount = totalPot;
        if (amount == 0) revert EmptyPot();

        // Effects
        totalPot = 0;

        emit EmergencyWithdrawn(msg.sender, amount);

        // Interaction
        usdc.safeTransfer(msg.sender, amount);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Internal
    // ──────────────────────────────────────────────────────────────────────

    /// @dev Core pot-share calculation: totalPot * (MAX_SLOTS - currentSlots) / MAX_SLOTS.
    ///      When currentSlots == MAX_SLOTS (all 36 filled), the share is zero — no payout.
    /// @param currentSlots Number of filled slots (already validated by caller).
    /// @return share       The gross USDC amount before fees.
    function _calculatePotShare(
        uint256 currentSlots
    ) internal view returns (uint256 share) {
        // Cannot underflow: currentSlots <= MAX_SLOTS enforced by callers.
        unchecked {
            share = (totalPot * (MAX_SLOTS - currentSlots)) / MAX_SLOTS;
        }
    }
}
