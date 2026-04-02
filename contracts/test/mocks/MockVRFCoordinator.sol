// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";

/// @title MockVRFCoordinator
/// @notice Minimal mock of Chainlink VRF V2.5 Coordinator for testing.
///         Allows tests to trigger fulfillment with controlled random values.
contract MockVRFCoordinator {
    uint256 private _nextRequestId = 1;

    /// @notice Stores the consumer address for each request so we can callback.
    mapping(uint256 => address) public requestConsumer;

    /// @notice Mimics requestRandomWords. Records the caller (consumer) and returns a requestId.
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata /* req */
    ) external returns (uint256 requestId) {
        requestId = _nextRequestId++;
        requestConsumer[requestId] = msg.sender;
    }

    /// @notice Fulfill a VRF request with controlled random words.
    /// @dev Calls rawFulfillRandomWords on the consumer contract, which validates
    ///      msg.sender == s_vrfCoordinator (this contract).
    /// @param requestId The request ID to fulfill.
    /// @param consumer The consumer contract address.
    /// @param randomWords The random values to deliver.
    function fulfillRandomWordsWithOverride(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) external {
        // Call rawFulfillRandomWords on the consumer.
        // The consumer's VRFConsumerBaseV2Plus checks msg.sender == coordinator (this contract).
        (bool success, bytes memory ret) = consumer.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        if (!success) {
            // Bubble up the revert reason
            assembly {
                revert(add(ret, 0x20), mload(ret))
            }
        }
    }
}
