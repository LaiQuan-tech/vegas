// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {CyberRoulette} from "../src/CyberRoulette.sol";
import {ICyberRoulette} from "../src/interfaces/ICyberRoulette.sol";
import {LegacyPot} from "../src/LegacyPot.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MockVRFCoordinator} from "./mocks/MockVRFCoordinator.sol";

/// @title CyberRouletteTest
/// @notice Comprehensive Foundry test suite for CyberRoulette.
contract CyberRouletteTest is Test {
    CyberRoulette public roulette;
    LegacyPot public legacyPot;
    MockUSDC public usdc;
    MockVRFCoordinator public vrfCoordinator;

    address public owner;
    address public alice;
    address public bob;
    address public platformWallet;

    uint256 constant SUB_ID = 1;
    bytes32 constant KEY_HASH = keccak256("test");

    // 1000 USDC (6 decimals)
    uint256 constant INITIAL_RESERVE = 1_000e6;
    uint128 constant BET_AMOUNT = 1e6; // 1 USDC

    function setUp() public {
        owner = address(this); // Test contract is deployer, hence owner via ConfirmedOwner
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        platformWallet = makeAddr("platform");

        // Deploy mock dependencies
        usdc = new MockUSDC();
        vrfCoordinator = new MockVRFCoordinator();

        // Deploy LegacyPot with this test contract as owner
        legacyPot = new LegacyPot(address(usdc), owner);

        // Deploy CyberRoulette — deployer (this) becomes owner via ConfirmedOwner
        roulette = new CyberRoulette(
            address(usdc),
            address(legacyPot),
            address(vrfCoordinator),
            SUB_ID,
            KEY_HASH
        );

        // Authorize the roulette table on LegacyPot
        legacyPot.addAuthorizedCaller(address(roulette));

        // Seed reserve so bets can be placed (maxBet depends on reserve)
        usdc.mint(owner, INITIAL_RESERVE);
        usdc.approve(address(roulette), INITIAL_RESERVE);
        roulette.seedReserve(INITIAL_RESERVE);

        // Fund players
        usdc.mint(alice, 100_000e6);
        usdc.mint(bob, 100_000e6);

        vm.prank(alice);
        usdc.approve(address(roulette), type(uint256).max);

        vm.prank(bob);
        usdc.approve(address(roulette), type(uint256).max);
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    /// @dev Place a bet as `player` and return the VRF requestId.
    function _placeBet(address player, uint8 number, uint128 amount) internal returns (uint256 requestId) {
        vm.prank(player);
        requestId = roulette.placeBet(number, amount);
    }

    /// @dev Fulfill VRF with a specific random value that maps to `desiredResult`.
    ///      desiredResult must be in [0, currentSlots]. The random word is crafted
    ///      so that randomWord % (slots + 1) == desiredResult.
    function _fulfillVRF(uint256 requestId, uint8 desiredResult, uint8 slotsAtBet) internal {
        // randomWord % (slots + 1) == desiredResult
        // Simply use desiredResult itself since desiredResult < slots + 1.
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(desiredResult);
        vrfCoordinator.fulfillRandomWordsWithOverride(requestId, address(roulette), randomWords);
    }

    // ──────────────────────────────────────────────
    //  placeBet tests
    // ──────────────────────────────────────────────

    function test_placeBet_validBet() public {
        uint256 requestId = _placeBet(alice, 5, BET_AMOUNT);

        // Verify bet stored
        ICyberRoulette.Bet memory bet = roulette.getBet(requestId);
        assertEq(bet.player, alice);
        assertEq(bet.amount, BET_AMOUNT);
        assertEq(bet.number, 5);
        assertFalse(bet.settled);

        // Verify USDC transferred
        assertEq(usdc.balanceOf(address(roulette)), INITIAL_RESERVE + BET_AMOUNT);

        // Verify hasPendingBet
        assertTrue(roulette.hasPendingBet(alice));
    }

    function test_placeBet_invalidNumber_zero() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ICyberRoulette.InvalidNumber.selector, 0, 36));
        roulette.placeBet(0, BET_AMOUNT);
    }

    function test_placeBet_invalidNumber_tooHigh() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ICyberRoulette.InvalidNumber.selector, 37, 36));
        roulette.placeBet(37, BET_AMOUNT);
    }

    function test_placeBet_exceedsMaxBet() public {
        uint256 maxBet = roulette.getMaxBet();
        uint128 tooMuch = uint128(maxBet + 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ICyberRoulette.BetTooLarge.selector, uint256(tooMuch), maxBet));
        roulette.placeBet(1, tooMuch);
    }

    function test_placeBet_zeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(ICyberRoulette.ZeroBetAmount.selector);
        roulette.placeBet(1, 0);
    }

    function test_placeBet_alreadyPending() public {
        _placeBet(alice, 5, BET_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(ICyberRoulette.BetAlreadyPending.selector);
        roulette.placeBet(5, BET_AMOUNT);
    }

    function test_placeBet_whenPaused() public {
        roulette.setGamePaused(true);

        vm.prank(alice);
        vm.expectRevert(ICyberRoulette.GamePaused.selector);
        roulette.placeBet(1, BET_AMOUNT);
    }

    // ──────────────────────────────────────────────
    //  Win settlement tests
    // ──────────────────────────────────────────────

    function test_win_payout() public {
        uint8 chosenNumber = 5;
        uint8 slots = roulette.currentSlots(); // 36

        uint256 requestId = _placeBet(alice, chosenNumber, BET_AMOUNT);

        uint256 aliceBalBefore = usdc.balanceOf(alice);

        // Fulfill VRF so result == chosenNumber (a win)
        _fulfillVRF(requestId, chosenNumber, slots);

        // Verify bet settled
        ICyberRoulette.Bet memory bet = roulette.getBet(requestId);
        assertTrue(bet.settled);
        assertFalse(roulette.hasPendingBet(alice));

        // Win payout: basePrize = betAmount * slots = 1e6 * 36 = 36e6
        // fee = basePrize * 500 / 10000 = 36e6 * 5% = 1.8e6
        // netBasePrize = 36e6 - 1.8e6 = 34.2e6
        uint256 basePrize = uint256(BET_AMOUNT) * uint256(slots);
        uint256 fee = (basePrize * 500) / 10_000;
        uint256 expectedNet = basePrize - fee;

        uint256 aliceBalAfter = usdc.balanceOf(alice);
        assertEq(aliceBalAfter - aliceBalBefore, expectedNet);
    }

    function test_win_resetsSlots() public {
        // First cause a loss to reduce slots
        uint256 reqId1 = _placeBet(alice, 1, BET_AMOUNT);
        // Result = 2 (not 1, not 0) -> loss
        _fulfillVRF(reqId1, 2, 36);
        assertEq(roulette.currentSlots(), 35);

        // Now win to reset
        uint256 reqId2 = _placeBet(alice, 1, BET_AMOUNT);
        _fulfillVRF(reqId2, 1, 35);
        assertEq(roulette.currentSlots(), 36);
    }

    function test_win_platformFeeAccrues() public {
        uint8 chosenNumber = 10;
        uint8 slots = roulette.currentSlots();
        uint256 requestId = _placeBet(alice, chosenNumber, BET_AMOUNT);

        uint256 platformBefore = roulette.platformBalance();
        _fulfillVRF(requestId, chosenNumber, slots);
        uint256 platformAfter = roulette.platformBalance();

        uint256 basePrize = uint256(BET_AMOUNT) * uint256(slots);
        uint256 expectedFee = (basePrize * 500) / 10_000;
        assertEq(platformAfter - platformBefore, expectedFee);
    }

    // ──────────────────────────────────────────────
    //  Loss settlement tests
    // ──────────────────────────────────────────────

    function test_lose_slotsDecrease() public {
        uint256 requestId = _placeBet(alice, 1, BET_AMOUNT);
        // Result = 2 -> loss (not 0, not 1)
        _fulfillVRF(requestId, 2, 36);
        assertEq(roulette.currentSlots(), 35);
    }

    function test_lose_fundSplit() public {
        uint256 reserveBefore = roulette.reserve();
        uint256 platformBefore = roulette.platformBalance();
        uint256 legacyPotBefore = legacyPot.totalPot();

        uint256 requestId = _placeBet(alice, 1, BET_AMOUNT);
        _fulfillVRF(requestId, 2, 36);

        uint256 amount = uint256(BET_AMOUNT);

        // 80% to reserve
        uint256 expectedReserve = (amount * 8_000) / 10_000;
        assertEq(roulette.reserve() - reserveBefore, expectedReserve);

        // 15% to legacy pot
        uint256 expectedPot = (amount * 1_500) / 10_000;
        assertEq(legacyPot.totalPot() - legacyPotBefore, expectedPot);

        // 5% to platform
        uint256 expectedPlatform = amount - expectedReserve - expectedPot;
        assertEq(roulette.platformBalance() - platformBefore, expectedPlatform);
    }

    function test_lose_multipleLosses() public {
        // Several consecutive losses
        for (uint8 i = 0; i < 5; i++) {
            uint256 reqId = _placeBet(alice, 1, BET_AMOUNT);
            // Result = currentSlots (always valid, never 0, never 1 when slots > 1)
            uint8 slots = roulette.currentSlots();
            _fulfillVRF(reqId, slots, slots);
        }
        assertEq(roulette.currentSlots(), 31);
    }

    // ──────────────────────────────────────────────
    //  Zero (system wipe) settlement tests
    // ──────────────────────────────────────────────

    function test_systemWipe() public {
        uint256 platformBefore = roulette.platformBalance();
        uint256 legacyPotBefore = legacyPot.totalPot();

        uint256 requestId = _placeBet(alice, 5, BET_AMOUNT);
        // Result = 0 -> zero/system wipe
        _fulfillVRF(requestId, 0, 36);

        uint256 amount = uint256(BET_AMOUNT);
        uint256 toPot = (amount * 5_000) / 10_000;
        uint256 toPlatform = amount - toPot;

        assertEq(legacyPot.totalPot() - legacyPotBefore, toPot);
        assertEq(roulette.platformBalance() - platformBefore, toPlatform);

        // Slots should NOT change on zero
        assertEq(roulette.currentSlots(), 36);
    }

    // ──────────────────────────────────────────────
    //  Seat management tests
    // ──────────────────────────────────────────────

    function test_abandonSeat() public {
        // Alice places a bet and gets settled (so no pending bet)
        uint256 reqId = _placeBet(alice, 1, BET_AMOUNT);
        _fulfillVRF(reqId, 2, 36); // loss, settles the bet

        // Alice is currentPlayer, can abandon
        vm.prank(alice);
        roulette.abandonSeat();

        assertTrue(roulette.seatOpen());
        assertEq(roulette.currentPlayer(), address(0));
    }

    function test_abandonSeat_unauthorized() public {
        // Bob is not the current player
        vm.prank(bob);
        vm.expectRevert(ICyberRoulette.Unauthorized.selector);
        roulette.abandonSeat();
    }

    function test_abandonSeat_pendingBet() public {
        _placeBet(alice, 1, BET_AMOUNT);
        // Alice has a pending bet — cannot abandon
        vm.prank(alice);
        vm.expectRevert(ICyberRoulette.BetAlreadyPending.selector);
        roulette.abandonSeat();
    }

    function test_claimSeat() public {
        // Alice bets, gets settled, then abandons
        uint256 reqId = _placeBet(alice, 1, BET_AMOUNT);
        _fulfillVRF(reqId, 2, 36);

        vm.prank(alice);
        roulette.abandonSeat();

        // Advance past L3 priority window (5 seconds) but within relay window (30 seconds)
        vm.warp(block.timestamp + 10);

        vm.prank(bob);
        roulette.claimSeat();

        assertEq(roulette.currentPlayer(), bob);
        assertFalse(roulette.seatOpen());
    }

    function test_claimSeat_l3Priority() public {
        // Alice bets, gets settled, then abandons
        uint256 reqId = _placeBet(alice, 1, BET_AMOUNT);
        _fulfillVRF(reqId, 2, 36);

        vm.prank(alice);
        roulette.abandonSeat();

        // Within L3 priority window, non-L3 user should fail
        vm.warp(block.timestamp + 2);
        vm.prank(bob);
        vm.expectRevert(ICyberRoulette.L3OnlyPeriod.selector);
        roulette.claimSeat();

        // Set bob as L3 subscriber and try again
        roulette.setL3Subscriber(bob, true);
        vm.prank(bob);
        roulette.claimSeat();
        assertEq(roulette.currentPlayer(), bob);
    }

    function test_claimSeat_relayExpired() public {
        uint256 reqId = _placeBet(alice, 1, BET_AMOUNT);
        _fulfillVRF(reqId, 2, 36);

        vm.prank(alice);
        roulette.abandonSeat();

        // Advance past relay window
        vm.warp(block.timestamp + 31);

        vm.prank(bob);
        vm.expectRevert(ICyberRoulette.RelayWindowExpired.selector);
        roulette.claimSeat();
    }

    // ──────────────────────────────────────────────
    //  maxBet calculation tests
    // ──────────────────────────────────────────────

    function test_maxBet() public view {
        // maxBet = (reserve * 4) / (slots * 5)
        // = (1000e6 * 4) / (36 * 5) = 4000e6 / 180 = 22_222_222
        uint256 expected = (INITIAL_RESERVE * 4) / (36 * 5);
        assertEq(roulette.getMaxBet(), expected);
    }

    function test_maxBet_afterLoss() public {
        // Loss adds 80% of bet to reserve, slots decrease by 1
        uint256 requestId = _placeBet(alice, 1, BET_AMOUNT);
        _fulfillVRF(requestId, 2, 36);

        uint256 newReserve = roulette.reserve();
        uint8 newSlots = roulette.currentSlots();
        uint256 expected = (newReserve * 4) / (uint256(newSlots) * 5);
        assertEq(roulette.getMaxBet(), expected);
    }

    // ──────────────────────────────────────────────
    //  Admin tests
    // ──────────────────────────────────────────────

    function test_seedReserve() public {
        uint256 reserveBefore = roulette.reserve();
        uint256 seedAmount = 500e6;

        usdc.mint(owner, seedAmount);
        usdc.approve(address(roulette), seedAmount);
        roulette.seedReserve(seedAmount);

        assertEq(roulette.reserve(), reserveBefore + seedAmount);
    }

    function test_withdrawPlatformFees() public {
        // Generate some platform fees via a loss
        uint256 requestId = _placeBet(alice, 1, BET_AMOUNT);
        _fulfillVRF(requestId, 2, 36);

        uint256 platformBal = roulette.platformBalance();
        assertGt(platformBal, 0);

        uint256 recipientBefore = usdc.balanceOf(platformWallet);
        roulette.withdrawPlatformFees(platformWallet);
        uint256 recipientAfter = usdc.balanceOf(platformWallet);

        assertEq(recipientAfter - recipientBefore, platformBal);
        assertEq(roulette.platformBalance(), 0);
    }

    function test_setGamePaused() public {
        roulette.setGamePaused(true);
        assertTrue(roulette.gamePaused());

        roulette.setGamePaused(false);
        assertFalse(roulette.gamePaused());
    }

    // ──────────────────────────────────────────────
    //  View function tests
    // ──────────────────────────────────────────────

    function test_potBalance() public view {
        // potBalance == usdc.balanceOf(roulette)
        assertEq(roulette.potBalance(), usdc.balanceOf(address(roulette)));
    }

    function test_getRebalanceTimeout() public view {
        // At 36 slots -> TIMEOUT_HIGH = 48 hours
        assertEq(roulette.getRebalanceTimeout(), 48 hours);
    }

    function test_seatOpen_initial() public view {
        // Initially no player, seat is open
        assertTrue(roulette.seatOpen());
    }

    function test_seatOpen_afterBet() public {
        _placeBet(alice, 1, BET_AMOUNT);
        // Alice implicitly claimed the seat
        assertEq(roulette.currentPlayer(), alice);
    }
}
