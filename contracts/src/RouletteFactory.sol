// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ICyberRoulette} from "./interfaces/ICyberRoulette.sol";
import {CyberRoulette} from "./CyberRoulette.sol";

/// @title RouletteFactory
/// @author Vegas Protocol
/// @notice Factory contract for deploying and managing multiple CyberRoulette tables
/// @dev Uses Ownable2Step for safe ownership transfers. Tracks active tables in an
///      array with O(1) deactivation via swap-and-pop. Queries table state through
///      the ICyberRoulette interface so the factory never touches table storage directly.
contract RouletteFactory is Ownable2Step {
    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    /// @notice Snapshot of a single table's on-chain state
    /// @param tableAddress  Deployed address of the CyberRoulette contract
    /// @param currentSlots  Number of occupied slots at the table
    /// @param potBalance    ETH held in the table's pot
    /// @param currentPlayer Address of the seated player (address(0) if none)
    /// @param lastBetTimestamp Block timestamp of the most recent bet
    /// @param seatOpen      Whether the table accepts a new player
    struct TableState {
        address tableAddress;
        uint256 currentSlots;
        uint256 potBalance;
        address currentPlayer;
        uint256 lastBetTimestamp;
        bool seatOpen;
    }

    // ──────────────────────────────────────────────
    //  Storage
    // ──────────────────────────────────────────────

    /// @notice USDC token address used for new tables
    address public usdc;

    /// @notice LegacyPot address used for new tables
    address public legacyPot;

    /// @notice VRF Coordinator address used for new tables
    address public vrfCoordinator;

    /// @notice VRF subscription ID used for new tables
    uint256 public vrfSubscriptionId;

    /// @notice VRF key hash used for new tables
    bytes32 public vrfKeyHash;

    /// @notice Ordered list of active table addresses
    address[] private _activeTables;

    /// @notice Maps a table address to its index+1 in _activeTables (0 means not active)
    /// @dev Stored as index+1 so that the default mapping value (0) means "not present".
    ///      The actual array index is `_tableIndex[addr] - 1`.
    mapping(address => uint256) private _tableIndex;

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    /// @notice Thrown when attempting to deactivate a table that is not in the active set
    error TableNotActive(address table);

    /// @notice Thrown when no active tables exist but a query requires at least one
    error NoActiveTables();

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a new CyberRoulette table is deployed
    /// @param table   Address of the newly deployed table
    /// @param tableId Sequential index at the time of creation
    event TableCreated(address indexed table, uint256 tableId);

    /// @notice Emitted when an existing table is removed from the active set
    /// @param table Address of the deactivated table
    event TableDeactivated(address indexed table);

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /// @param owner_ Address that will own the factory and all tables it creates
    /// @param usdc_ USDC token address
    /// @param legacyPot_ LegacyPot contract address
    /// @param vrfCoordinator_ Chainlink VRF Coordinator address
    /// @param vrfSubscriptionId_ Chainlink VRF subscription ID
    /// @param vrfKeyHash_ Chainlink VRF key hash
    constructor(
        address owner_,
        address usdc_,
        address legacyPot_,
        address vrfCoordinator_,
        uint256 vrfSubscriptionId_,
        bytes32 vrfKeyHash_
    ) Ownable(owner_) {
        usdc = usdc_;
        legacyPot = legacyPot_;
        vrfCoordinator = vrfCoordinator_;
        vrfSubscriptionId = vrfSubscriptionId_;
        vrfKeyHash = vrfKeyHash_;
    }

    // ──────────────────────────────────────────────
    //  Table Lifecycle (owner only)
    // ──────────────────────────────────────────────

    /// @notice Deploy a new CyberRoulette table and register it as active
    /// @return table Address of the newly deployed CyberRoulette contract
    function createTable() external onlyOwner returns (address table) {
        CyberRoulette newTable = new CyberRoulette(
            usdc,
            legacyPot,
            vrfCoordinator,
            vrfSubscriptionId,
            vrfKeyHash
        );

        table = address(newTable);

        // Register in the active set — index is stored as length (i.e. position + 1)
        _activeTables.push(table);
        _tableIndex[table] = _activeTables.length;

        emit TableCreated(table, _activeTables.length - 1);
    }

    /// @notice Remove a table from the active set (swap-and-pop for O(1) removal)
    /// @dev Does NOT destroy or pause the table contract itself — it only removes the
    ///      factory's tracking reference. Call table-level pause separately if needed.
    /// @param table Address of the table to deactivate
    function deactivateTable(address table) external onlyOwner {
        uint256 oneBasedIndex = _tableIndex[table];
        if (oneBasedIndex == 0) revert TableNotActive(table);

        uint256 lastIndex = _activeTables.length - 1;
        uint256 removeIndex = oneBasedIndex - 1;

        // If the element to remove is not the last, swap it with the last element
        if (removeIndex != lastIndex) {
            address lastTable = _activeTables[lastIndex];
            _activeTables[removeIndex] = lastTable;
            _tableIndex[lastTable] = oneBasedIndex; // preserve 1-based index
        }

        _activeTables.pop();
        delete _tableIndex[table];

        emit TableDeactivated(table);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @notice Returns the full list of active table addresses
    /// @return tables Array of addresses currently in the active set
    function getActiveTables() external view returns (address[] memory tables) {
        tables = _activeTables;
    }

    /// @notice Returns the number of active tables
    /// @return count Length of the active tables array
    function getTableCount() external view returns (uint256 count) {
        count = _activeTables.length;
    }

    /// @notice Returns the table with the lowest currentSlots value
    /// @dev Iterates all active tables — bounded by the number of tables the owner has
    ///      deployed. Reverts if no tables exist. Ties are broken by first occurrence.
    /// @return hottest Address of the table with the fewest occupied slots
    function getHottestTable() external view returns (address hottest) {
        uint256 len = _activeTables.length;
        if (len == 0) revert NoActiveTables();

        uint256 lowestSlots = type(uint256).max;

        for (uint256 i; i < len;) {
            address t = _activeTables[i];
            uint256 slots = ICyberRoulette(t).currentSlots();
            if (slots < lowestSlots) {
                lowestSlots = slots;
                hottest = t;
            }
            unchecked { ++i; }
        }
    }

    /// @notice Returns a snapshot of every active table's on-chain state
    /// @dev Makes one external call per table per field. Bounded by the number of
    ///      active tables — safe as long as the owner does not deploy thousands.
    /// @return states Array of TableState structs, one per active table
    function getTableStates() external view returns (TableState[] memory states) {
        uint256 len = _activeTables.length;
        states = new TableState[](len);

        for (uint256 i; i < len;) {
            address t = _activeTables[i];
            ICyberRoulette table_ = ICyberRoulette(t);

            states[i] = TableState({
                tableAddress: t,
                currentSlots: table_.currentSlots(),
                potBalance: table_.potBalance(),
                currentPlayer: table_.currentPlayer(),
                lastBetTimestamp: table_.lastBetTimestamp(),
                seatOpen: table_.seatOpen()
            });

            unchecked { ++i; }
        }
    }
}
