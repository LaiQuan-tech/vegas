// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LegacyPot} from "../src/LegacyPot.sol";
import {CyberRoulette} from "../src/CyberRoulette.sol";
import {RouletteFactory} from "../src/RouletteFactory.sol";

/// @title Deploy
/// @notice Deployment script for the Vegas protocol on Base / Base Sepolia
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast --verify
contract Deploy is Script {
    /// @notice Main deployment entrypoint
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        uint256 vrfSubscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");
        bytes32 vrfKeyHash = vm.envBytes32("VRF_KEY_HASH");

        console2.log("=== Vegas Protocol Deployment ===");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // -------------------------------------------------------
        // 1. Deploy or resolve USDC address
        // -------------------------------------------------------
        address usdcAddress;

        if (_isTestnet()) {
            MockUSDC mockUsdc = new MockUSDC();
            usdcAddress = address(mockUsdc);
            console2.log("MockUSDC deployed to:", usdcAddress);
        } else {
            // Base mainnet USDC (native)
            usdcAddress = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
            console2.log("Using mainnet USDC:", usdcAddress);
        }

        // -------------------------------------------------------
        // 2. Deploy LegacyPot
        // -------------------------------------------------------
        LegacyPot legacyPot = new LegacyPot(usdcAddress, deployer);
        console2.log("LegacyPot deployed to:", address(legacyPot));

        // -------------------------------------------------------
        // 3. Deploy CyberRoulette
        // -------------------------------------------------------
        CyberRoulette cyberRoulette = new CyberRoulette(
            usdcAddress,
            address(legacyPot),
            vrfCoordinator,
            vrfSubscriptionId,
            vrfKeyHash
        );
        console2.log("CyberRoulette deployed to:", address(cyberRoulette));

        // -------------------------------------------------------
        // 4. Register CyberRoulette as authorized caller on LegacyPot
        // -------------------------------------------------------
        legacyPot.addAuthorizedCaller(address(cyberRoulette));
        console2.log("CyberRoulette registered as authorized caller on LegacyPot");

        // -------------------------------------------------------
        // 5. Deploy RouletteFactory
        // -------------------------------------------------------
        RouletteFactory factory = new RouletteFactory(
            deployer,
            usdcAddress,
            address(legacyPot),
            vrfCoordinator,
            vrfSubscriptionId,
            vrfKeyHash
        );
        console2.log("RouletteFactory deployed to:", address(factory));

        vm.stopBroadcast();

        // -------------------------------------------------------
        // Summary
        // -------------------------------------------------------
        console2.log("");
        console2.log("=== Deployment Summary ===");
        console2.log("USDC:            ", usdcAddress);
        console2.log("LegacyPot:       ", address(legacyPot));
        console2.log("CyberRoulette:   ", address(cyberRoulette));
        console2.log("RouletteFactory: ", address(factory));
        console2.log("==========================");
    }

    /// @dev Returns true if deploying to a testnet (Base Sepolia = 84532)
    function _isTestnet() internal view returns (bool) {
        return block.chainid != 8453; // 8453 = Base mainnet
    }
}
