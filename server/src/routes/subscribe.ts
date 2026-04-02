import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  upsertUser,
  getSubscribersByWallet,
  deleteSubscriber,
} from "../db/index.js";

interface SubscribeBody {
  wallet: string;
  telegram_chat_id: string;
  subscription_level: number;
  expires_at?: string | null;
}

interface WalletParams {
  wallet: string;
}

export async function subscribeRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/subscribe
   * Create or update a subscription.
   */
  app.post<{ Body: SubscribeBody }>(
    "/api/subscribe",
    async (req: FastifyRequest<{ Body: SubscribeBody }>, reply: FastifyReply) => {
      const { wallet, telegram_chat_id, subscription_level, expires_at } = req.body;

      // Validate wallet address
      if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return reply.status(400).send({ ok: false, error: "Invalid wallet address" });
      }

      // Validate telegram chat ID
      if (!telegram_chat_id || typeof telegram_chat_id !== "string") {
        return reply.status(400).send({ ok: false, error: "telegram_chat_id is required" });
      }

      // Validate subscription level
      if (![1, 2, 3].includes(subscription_level)) {
        return reply.status(400).send({
          ok: false,
          error: "subscription_level must be 1, 2, or 3",
        });
      }

      const expiresDate = expires_at ? new Date(expires_at) : null;

      if (expiresDate && isNaN(expiresDate.getTime())) {
        return reply.status(400).send({ ok: false, error: "Invalid expires_at date" });
      }

      const user = await upsertUser(
        wallet.toLowerCase(),
        telegram_chat_id,
        subscription_level,
        expiresDate,
      );

      return reply.status(201).send({ ok: true, data: user });
    },
  );

  /**
   * GET /api/subscribe/:wallet
   * Get all subscriptions for a wallet.
   */
  app.get<{ Params: WalletParams }>(
    "/api/subscribe/:wallet",
    async (req, reply) => {
      const { wallet } = req.params;

      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return reply.status(400).send({ ok: false, error: "Invalid wallet address" });
      }

      const subs = await getSubscribersByWallet(wallet.toLowerCase());

      return reply.send({ ok: true, data: subs });
    },
  );

  /**
   * DELETE /api/subscribe/:wallet
   * Remove all subscriptions for a wallet.
   */
  app.delete<{ Params: WalletParams }>(
    "/api/subscribe/:wallet",
    async (req, reply) => {
      const { wallet } = req.params;

      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return reply.status(400).send({ ok: false, error: "Invalid wallet address" });
      }

      const deleted = await deleteSubscriber(wallet.toLowerCase());

      if (!deleted) {
        return reply.status(404).send({ ok: false, error: "No subscriptions found for this wallet" });
      }

      return reply.send({ ok: true, message: "Subscriptions removed" });
    },
  );
}
