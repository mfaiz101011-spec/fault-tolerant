import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool, withTransaction } from "./db";
import { makeIdempotencyKey, normalizeEvent } from "./normalize";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "database_unavailable" });
  }
});

app.post("/api/events", async (req, res) => {
  const simulateFailure =
    req.query.simulateFailure === "true" ||
    req.body?.simulateFailure === true;

  const raw = req.body?.event ?? req.body;
  const source = typeof raw?.source === "string" ? raw.source : "unknown";

  let rawId: string | undefined;

  try {
    const rawInsert = await pool.query(
      `INSERT INTO raw_events (source, payload, status)
       VALUES ($1, $2::jsonb, 'failed')
       RETURNING id`,
      [source, JSON.stringify(raw)]
    );
    rawId = rawInsert.rows[0].id;

    const normalized = normalizeEvent(raw);

    if (!normalized.ok) {
      await pool.query(
        `UPDATE raw_events SET status='rejected', error_message=$1 WHERE id=$2`,
        [normalized.error, rawId]
      );
      return res.status(400).json({
        success: false,
        status: "rejected",
        message: normalized.error,
        raw_event_id: rawId,
      });
    }

    const event = normalized.value;
    const idempotencyKey = makeIdempotencyKey(event);

    const result = await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM processed_events WHERE idempotency_key=$1`,
        [idempotencyKey]
      );

      if (existing.rowCount) {
        await client.query(
          `UPDATE raw_events SET status='processed', error_message=NULL WHERE id=$1`,
          [rawId]
        );
        return { duplicate: true, id: existing.rows[0].id };
      }

      if (simulateFailure) {
        throw new Error("Simulated database failure");
      }

      const inserted = await client.query(
        `INSERT INTO processed_events
         (raw_event_id, idempotency_key, client_id, metric, amount, event_timestamp)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [
          rawId,
          idempotencyKey,
          event.client_id,
          event.metric,
          event.amount,
          event.timestamp,
        ]
      );

      await client.query(
        `UPDATE raw_events SET status='processed', error_message=NULL WHERE id=$1`,
        [rawId]
      );

      return { duplicate: false, id: inserted.rows[0].id };
    });

    if (result.duplicate) {
      return res.status(200).json({
        success: true,
        status: "duplicate",
        message: "Event was already processed; no double counting occurred.",
        processed_event_id: result.id,
        raw_event_id: rawId,
      });
    }

    return res.status(201).json({
      success: true,
      status: "processed",
      message: "Event normalized and processed successfully.",
      processed_event_id: result.id,
      normalized: event,
      raw_event_id: rawId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    if (rawId) {
      await pool.query(
        `UPDATE raw_events SET status='failed', error_message=$1 WHERE id=$2`,
        [message, rawId]
      ).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      status: "failed",
      message,
      raw_event_id: rawId ?? null,
    });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const params: unknown[] = [];
    let where = "";
    if (status) {
      params.push(status);
      where = `WHERE status=$${params.length}`;
    }
    params.push(limit);

    const result = await pool.query(
      `SELECT id, source, payload, received_at, status, error_message
       FROM raw_events ${where}
       ORDER BY received_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Could not load events" });
  }
});

app.get("/api/aggregations", async (req, res) => {
  try {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (typeof req.query.client === "string" && req.query.client) {
      params.push(req.query.client);
      conditions.push(`client_id=$${params.length}`);
    }
    if (typeof req.query.from === "string" && req.query.from) {
      params.push(req.query.from);
      conditions.push(`event_timestamp >= $${params.length}`);
    }
    if (typeof req.query.to === "string" && req.query.to) {
      params.push(req.query.to);
      conditions.push(`event_timestamp <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const summary = await pool.query(
      `SELECT COUNT(*)::int AS event_count,
              COALESCE(SUM(amount),0)::float AS total_amount
       FROM processed_events ${where}`,
      params
    );

    const byMetric = await pool.query(
      `SELECT metric,
              COUNT(*)::int AS event_count,
              COALESCE(SUM(amount),0)::float AS total_amount
       FROM processed_events ${where}
       GROUP BY metric
       ORDER BY total_amount DESC`,
      params
    );

    res.json({
      eventCount: summary.rows[0].event_count,
      totalAmount: summary.rows[0].total_amount,
      byMetric: byMetric.rows,
    });
  } catch {
    res.status(500).json({ error: "Could not calculate aggregation" });
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='processed')::int AS processed,
        COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status='failed')::int AS failed
      FROM raw_events
    `);
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Could not load stats" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
