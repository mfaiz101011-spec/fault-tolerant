import crypto from "crypto";

export type RawEvent = Record<string, unknown>;

export type NormalizedEvent = {
  client_id: string;
  metric: string;
  amount: number;
  timestamp: string;
};

function firstDefined(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return undefined;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const candidates = [
    raw,
    raw.replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, "$1-$2-$3"),
    raw.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1-$2-$3T00:00:00Z"),
  ];

  for (const candidate of candidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

export function normalizeEvent(input: RawEvent): {
  ok: true;
  value: NormalizedEvent;
} | {
  ok: false;
  error: string;
} {
  const payload =
    input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
      ? input.payload as Record<string, unknown>
      : input;

  const source = firstDefined(input, ["source", "client_id", "clientId", "client"]);
  const clientId = firstDefined(payload, ["client_id", "clientId", "client", "source"]) ?? source;
  const metric = firstDefined(payload, ["metric", "type", "name"]);
  const amount = firstDefined(payload, ["amount", "value", "total"]);
  const timestamp = firstDefined(payload, ["timestamp", "time", "date", "created_at"]);

  if (typeof clientId !== "string" || !clientId.trim()) {
    return { ok: false, error: "Missing or invalid client/source identifier" };
  }
  if (typeof metric !== "string" || !metric.trim()) {
    return { ok: false, error: "Missing or invalid metric" };
  }

  const parsedAmount = parseAmount(amount);
  if (parsedAmount === null) {
    return { ok: false, error: "Missing or malformed amount" };
  }

  const parsedTimestamp = parseTimestamp(timestamp);
  if (!parsedTimestamp) {
    return { ok: false, error: "Missing or malformed timestamp" };
  }

  return {
    ok: true,
    value: {
      client_id: clientId.trim(),
      metric: metric.trim(),
      amount: parsedAmount,
      timestamp: parsedTimestamp,
    },
  };
}

export function makeIdempotencyKey(event: NormalizedEvent): string {
  const canonical = JSON.stringify({
    client_id: event.client_id,
    metric: event.metric,
    amount: event.amount,
    timestamp: event.timestamp,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}
