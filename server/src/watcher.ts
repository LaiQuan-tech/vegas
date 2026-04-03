import { ethers } from "ethers";
import { config } from "./config.js";
import { upsertSnapshot, insertBet } from "./db/index.js";
import { broadcast, broadcastTableUpdate } from "./ws.js";
import { notifySubscribers, notifyEvent } from "./notify.js";

// ── ABI fragments for the events we care about ──

const CONTRACT_ABI = [
  "event BetPlaced(address indexed table, address indexed player, uint256 betNumber, uint256 betAmount, uint256 result, bool won, uint256 payout, uint256 potShare)",
  "event SlotReduced(address indexed table, uint256 slotsRemaining, uint256 pot)",
  "event PotWon(address indexed table, address indexed winner, uint256 amount)",
  "event SystemWipe(address indexed table, uint256 redistributed)",
  "event SeatAbandoned(address indexed table, address indexed player)",
  "event SeatClaimed(address indexed table, address indexed player)",
];

let provider: ethers.WebSocketProvider | null = null;
let contract: ethers.Contract | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ── Event handlers ───────────────────────────

async function onBetPlaced(
  table: string,
  player: string,
  betNumber: bigint,
  betAmount: bigint,
  result: bigint,
  won: boolean,
  payout: bigint,
  potShare: bigint,
  event: ethers.EventLog,
): Promise<void> {
  console.log(`[watcher] BetPlaced on ${table} by ${player} — bet #${betNumber}`);

  // Persist the bet
  await insertBet({
    table_address: table,
    player,
    bet_number: Number(betNumber),
    bet_amount: betAmount.toString(),
    result: Number(result),
    won,
    payout: payout.toString(),
    pot_share: potShare.toString(),
    tx_hash: event.transactionHash,
  });

  // Update snapshot with latest player and bet time
  const snapshot = await upsertSnapshot(table, {
    current_player: player,
    last_bet_at: new Date().toISOString(),
  });

  broadcastTableUpdate(snapshot);
}

async function onSlotReduced(
  table: string,
  slotsRemaining: bigint,
  pot: bigint,
): Promise<void> {
  const slots = Number(slotsRemaining);
  const potStr = pot.toString();

  console.log(`[watcher] SlotReduced on ${table} — ${slots} slots, pot=${potStr}`);

  const snapshot = await upsertSnapshot(table, {
    current_slots: slots,
    legacy_pot: potStr,
  });

  broadcastTableUpdate(snapshot);
  broadcast("SLOT_REDUCED", table, { current_slots: slots, pot: potStr });

  // Trigger threshold notifications
  await notifySubscribers(table, slots, potStr);
}

async function onPotWon(
  table: string,
  winner: string,
  amount: bigint,
): Promise<void> {
  const amountStr = amount.toString();
  const ethAmount = (Number(amount) / 1e18).toFixed(4);

  console.log(`[watcher] PotWon on ${table} — winner=${winner} amount=${ethAmount} ETH`);

  // Reset table snapshot
  const snapshot = await upsertSnapshot(table, {
    current_slots: 36,
    legacy_pot: "0",
    current_player: null,
    seat_open: true,
  });

  broadcastTableUpdate(snapshot);
  broadcast("POT_WON", table, { winner, amount: amountStr });

  await notifyEvent("POT_WON", table, `Winner: <code>${winner.slice(0, 6)}...${winner.slice(-4)}</code>\nAmount: <b>${ethAmount} ETH</b>`);
}

async function onSystemWipe(
  table: string,
  redistributed: bigint,
): Promise<void> {
  const ethAmount = (Number(redistributed) / 1e18).toFixed(4);

  console.log(`[watcher] SystemWipe on ${table} — redistributed=${ethAmount} ETH`);

  const snapshot = await upsertSnapshot(table, {
    current_slots: 36,
    legacy_pot: "0",
    current_player: null,
    seat_open: true,
  });

  broadcastTableUpdate(snapshot);
  broadcast("SYSTEM_WIPE", table, { redistributed: redistributed.toString() });

  await notifyEvent("SYSTEM_WIPE", table, `Redistributed: <b>${ethAmount} ETH</b>\nTable has been reset.`);
}

async function onSeatAbandoned(
  table: string,
  player: string,
): Promise<void> {
  console.log(`[watcher] SeatAbandoned on ${table} by ${player}`);

  const snapshot = await upsertSnapshot(table, {
    current_player: null,
    seat_open: true,
  });

  broadcastTableUpdate(snapshot);
  broadcast("SEAT_OPEN", table, { previous_player: player });

  await notifyEvent("SEAT_OPEN", table, `Player <code>${player.slice(0, 6)}...${player.slice(-4)}</code> left the seat.`);
}

async function onSeatClaimed(
  table: string,
  player: string,
): Promise<void> {
  console.log(`[watcher] SeatClaimed on ${table} by ${player}`);

  const snapshot = await upsertSnapshot(table, {
    current_player: player,
    seat_open: false,
  });

  broadcastTableUpdate(snapshot);
}

// ── Provider lifecycle ───────────────────────

function attachListeners(c: ethers.Contract): void {
  c.on("BetPlaced", onBetPlaced);
  c.on("SlotReduced", onSlotReduced);
  c.on("PotWon", onPotWon);
  c.on("SystemWipe", onSystemWipe);
  c.on("SeatAbandoned", onSeatAbandoned);
  c.on("SeatClaimed", onSeatClaimed);
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;

  console.log("[watcher] Scheduling reconnect in 5 seconds...");
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void startWatcher();
  }, 5_000);
}

export async function startWatcher(): Promise<void> {
  if (!config.RPC_WSS_URL || !config.CONTRACT_ADDRESS) {
    console.warn("[watcher] RPC_WSS_URL or CONTRACT_ADDRESS not set — chain watcher disabled");
    return;
  }

  try {
    // Clean up previous provider
    if (provider) {
      provider.removeAllListeners();
      await provider.destroy().catch(() => {});
    }

    console.log("[watcher] Connecting to", config.RPC_WSS_URL.slice(0, 30) + "...");

    provider = new ethers.WebSocketProvider(config.RPC_WSS_URL);

    // Wait for the provider to be ready
    await provider.ready;
    console.log("[watcher] WebSocket provider connected");

    // Listen for disconnect to trigger reconnect
    const ws = provider.websocket as unknown as import("ws").WebSocket;
    ws.on("close", () => {
      console.warn("[watcher] WebSocket disconnected");
      scheduleReconnect();
    });

    ws.on("error", (err: Error) => {
      console.error("[watcher] WebSocket error:", err.message);
      scheduleReconnect();
    });

    contract = new ethers.Contract(config.CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    attachListeners(contract);

    console.log("[watcher] Listening for events on", config.CONTRACT_ADDRESS);
  } catch (err) {
    console.error("[watcher] Failed to start:", err);
    scheduleReconnect();
  }
}

export async function stopWatcher(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (contract) {
    contract.removeAllListeners();
    contract = null;
  }

  if (provider) {
    provider.removeAllListeners();
    await provider.destroy().catch(() => {});
    provider = null;
  }

  console.log("[watcher] Stopped");
}
