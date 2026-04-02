// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {LegacyPot} from "../src/LegacyPot.sol";
import {ILegacyPot} from "../src/interfaces/ILegacyPot.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

/// @title LegacyPotTest
/// @notice Comprehensive Foundry test suite for LegacyPot.
contract LegacyPotTest is Test {
    LegacyPot public pot;
    MockUSDC public usdc;

    address public owner;
    address public gameTable; // authorized caller (simulates a CyberRoulette gameTable)
    address public alice;
    address public bob;

    uint256 constant DEPOSIT_AMOUNT = 100e6; // 100 USDC

    function setUp() public {
        owner = address(this);
        gameTable = makeAddr("gameTable");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        usdc = new MockUSDC();

        // Deploy LegacyPot with this test contract as owner
        pot = new LegacyPot(address(usdc), owner);

        // Authorize `gameTable` as a caller
        pot.addAuthorizedCaller(gameTable);

        // Fund the gameTable so it can deposit
        usdc.mint(gameTable, 1_000_000e6);
        vm.prank(gameTable);
        usdc.approve(address(pot), type(uint256).max);
    }

    // ──────────────────────────────────────────────
    //  Deposit tests
    // ──────────────────────────────────────────────

    function test_deposit() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        assertEq(pot.totalPot(), DEPOSIT_AMOUNT);
        assertEq(usdc.balanceOf(address(pot)), DEPOSIT_AMOUNT);
    }

    function test_deposit_multipleDeposits() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        vm.prank(gameTable);
        pot.deposit(50e6);

        assertEq(pot.totalPot(), 150e6);
    }

    function test_deposit_unauthorized() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ILegacyPot.UnauthorizedCaller.selector, alice));
        pot.deposit(DEPOSIT_AMOUNT);
    }

    function test_deposit_zeroAmount() public {
        vm.prank(gameTable);
        vm.expectRevert(ILegacyPot.ZeroAmount.selector);
        pot.deposit(0);
    }

    // ──────────────────────────────────────────────
    //  calculatePotShare tests
    // ──────────────────────────────────────────────

    function test_calculatePotShare_fullSlots() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        // At 36 slots (full), share = 0
        uint256 share = pot.calculatePotShare(36);
        assertEq(share, 0);
    }

    function test_calculatePotShare_halfSlots() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        // At 18 slots: share = 100e6 * (36 - 18) / 36 = 100e6 * 18/36 = 50e6
        uint256 share = pot.calculatePotShare(18);
        assertEq(share, 50e6);
    }

    function test_calculatePotShare_oneSlot() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        // At 1 slot: share = 100e6 * 35/36 = 97_222_222 (truncated)
        uint256 share = pot.calculatePotShare(1);
        uint256 expected = (DEPOSIT_AMOUNT * 35) / 36;
        assertEq(share, expected);
    }

    function test_calculatePotShare_invalidSlots_zero() public {
        vm.expectRevert(abi.encodeWithSelector(ILegacyPot.InvalidSlots.selector, 0));
        pot.calculatePotShare(0);
    }

    function test_calculatePotShare_invalidSlots_tooHigh() public {
        vm.expectRevert(abi.encodeWithSelector(ILegacyPot.InvalidSlots.selector, 37));
        pot.calculatePotShare(37);
    }

    // ──────────────────────────────────────────────
    //  Withdraw tests
    // ──────────────────────────────────────────────

    function test_withdraw() public {
        // Deposit funds
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        uint256 ownerBalBefore = usdc.balanceOf(owner);
        uint256 aliceBalBefore = usdc.balanceOf(alice);

        // Withdraw at 18 slots: grossShare = 50e6
        // fee = 50e6 * 500 / 10000 = 2.5e6
        // net = 50e6 - 2.5e6 = 47.5e6
        vm.prank(gameTable);
        pot.withdraw(alice, 18);

        uint256 grossShare = 50e6;
        uint256 fee = (grossShare * 500) / 10_000;
        uint256 net = grossShare - fee;

        assertEq(usdc.balanceOf(alice) - aliceBalBefore, net);
        assertEq(usdc.balanceOf(owner) - ownerBalBefore, fee);

        // Remaining pot: 100e6 - 50e6 = 50e6
        assertEq(pot.totalPot(), DEPOSIT_AMOUNT - grossShare);
    }

    function test_withdraw_unauthorized() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ILegacyPot.UnauthorizedCaller.selector, alice));
        pot.withdraw(alice, 18);
    }

    function test_withdraw_emptyPot() public {
        vm.prank(gameTable);
        vm.expectRevert(ILegacyPot.EmptyPot.selector);
        pot.withdraw(alice, 18);
    }

    function test_withdraw_zeroAddress() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        vm.prank(gameTable);
        vm.expectRevert(ILegacyPot.ZeroAddress.selector);
        pot.withdraw(address(0), 18);
    }

    function test_withdraw_fullSlotsZeroShare() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        // At 36 slots, gross share = 0. Should revert with EmptyPot since grossShare == 0.
        vm.prank(gameTable);
        vm.expectRevert(ILegacyPot.EmptyPot.selector);
        pot.withdraw(alice, 36);
    }

    // ──────────────────────────────────────────────
    //  mergeFrom tests
    // ──────────────────────────────────────────────

    function test_mergeFrom() public {
        vm.prank(gameTable);
        pot.mergeFrom(DEPOSIT_AMOUNT);

        assertEq(pot.totalPot(), DEPOSIT_AMOUNT);
    }

    function test_mergeFrom_unauthorized() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ILegacyPot.UnauthorizedCaller.selector, alice));
        pot.mergeFrom(DEPOSIT_AMOUNT);
    }

    // ──────────────────────────────────────────────
    //  Authorization management tests
    // ──────────────────────────────────────────────

    function test_addAuthorizedCaller() public {
        pot.addAuthorizedCaller(alice);
        assertTrue(pot.authorizedCallers(alice));
    }

    function test_addAuthorizedCaller_duplicate() public {
        pot.addAuthorizedCaller(alice);
        vm.expectRevert(abi.encodeWithSelector(ILegacyPot.AlreadyAuthorized.selector, alice));
        pot.addAuthorizedCaller(alice);
    }

    function test_removeAuthorizedCaller() public {
        pot.addAuthorizedCaller(alice);
        pot.removeAuthorizedCaller(alice);
        assertFalse(pot.authorizedCallers(alice));
    }

    function test_removeAuthorizedCaller_notAuthorized() public {
        vm.expectRevert(abi.encodeWithSelector(ILegacyPot.NotAuthorized.selector, alice));
        pot.removeAuthorizedCaller(alice);
    }

    // ──────────────────────────────────────────────
    //  Emergency withdrawal tests
    // ──────────────────────────────────────────────

    function test_emergencyWithdraw() public {
        vm.prank(gameTable);
        pot.deposit(DEPOSIT_AMOUNT);

        uint256 ownerBalBefore = usdc.balanceOf(owner);
        pot.emergencyWithdraw();
        uint256 ownerBalAfter = usdc.balanceOf(owner);

        assertEq(ownerBalAfter - ownerBalBefore, DEPOSIT_AMOUNT);
        assertEq(pot.totalPot(), 0);
    }

    function test_emergencyWithdraw_emptyPot() public {
        vm.expectRevert(ILegacyPot.EmptyPot.selector);
        pot.emergencyWithdraw();
    }

    // ──────────────────────────────────────────────
    //  Fuzz tests
    // ──────────────────────────────────────────────

    function testFuzz_calculatePotShare(uint256 depositAmt, uint256 slots) public {
        depositAmt = bound(depositAmt, 1, 1_000_000_000e6);
        slots = bound(slots, 1, 36);

        usdc.mint(gameTable, depositAmt);
        vm.prank(gameTable);
        pot.deposit(depositAmt);

        uint256 share = pot.calculatePotShare(slots);
        uint256 expected = (pot.totalPot() * (36 - slots)) / 36;
        assertEq(share, expected);
    }
}
