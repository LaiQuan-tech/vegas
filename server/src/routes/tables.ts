import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAllSnapshots, getSnapshot, getHistory } from "../db/index.js";

interface TableParams {
  address: string;
}

interface HistoryQuery {
  limit?: string;
  offset?: string;
}

export async function tableRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/tables
   * Returns all table snapshots ordered by slot count ascending.
   */
  app.get("/api/tables", async (_req: FastifyRequest, reply: FastifyReply) => {
    const tables = await getAllSnapshots();
    return reply.send({ ok: true, data: tables });
  });

  /**
   * GET /api/tables/:address
   * Returns a single table snapshot by contract address.
   */
  app.get<{ Params: TableParams }>(
    "/api/tables/:address",
    async (req, reply) => {
      const { address } = req.params;

      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return reply.status(400).send({ ok: false, error: "Invalid address format" });
      }

      const snapshot = await getSnapshot(address.toLowerCase());

      if (!snapshot) {
        return reply.status(404).send({ ok: false, error: "Table not found" });
      }

      return reply.send({ ok: true, data: snapshot });
    },
  );

  /**
   * GET /api/tables/:address/history
   * Returns bet history for a table. Supports ?limit=50&offset=0.
   */
  app.get<{ Params: TableParams; Querystring: HistoryQuery }>(
    "/api/tables/:address/history",
    async (req, reply) => {
      const { address } = req.params;

      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return reply.status(400).send({ ok: false, error: "Invalid address format" });
      }

      const limit = Math.min(Math.max(parseInt(req.query.limit ?? "50", 10) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset ?? "0", 10) || 0, 0);

      const history = await getHistory(address.toLowerCase(), limit, offset);

      return reply.send({
        ok: true,
        data: history,
        pagination: { limit, offset, count: history.length },
      });
    },
  );
}
