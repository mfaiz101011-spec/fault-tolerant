import { useEffect, useState } from "react";
import { CheckCircle2, Database, RefreshCw, Send, ShieldCheck, XCircle } from "lucide-react";

const API = "http://localhost:4000/api";

const sample = {
  source: "client_A",
  payload: {
    metric: "value",
    amount: "1200",
    timestamp: "2024/01/01"
  }
};

type EventRow = {
  id: number;
  source: string;
  payload: unknown;
  received_at: string;
  status: "processed" | "rejected" | "failed";
  error_message?: string;
};

type Aggregation = {
  eventCount: number;
  totalAmount: number;
  byMetric: { metric: string; event_count: number; total_amount: number }[];
};

export default function App() {
  const [json, setJson] = useState(JSON.stringify(sample, null, 2));
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [stats, setStats] = useState({ processed: 0, rejected: 0, failed: 0 });
  const [aggregation, setAggregation] = useState<Aggregation>({ eventCount: 0, totalAmount: 0, byMetric: [] });
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const [e, s, a] = await Promise.all([
      fetch(`${API}/events?limit=50`).then(r => r.json()),
      fetch(`${API}/stats`).then(r => r.json()),
      fetch(`${API}/aggregations`).then(r => r.json())
    ]);
    setEvents(e);
    setStats(s);
    setAggregation(a);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const event = JSON.parse(json);
      const response = await fetch(
        `${API}/events?simulateFailure=${simulateFailure}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event)
        }
      );
      const data = await response.json();
      setMessageType(response.ok ? "success" : "error");
      setMessage(data.message || "Request completed");
      await refresh();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof SyntaxError ? "Invalid JSON in editor." : "Backend unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">RELIABLE EVENT PIPELINE</div>
          <h1>Fault-Tolerant Data Processor</h1>
          <p>Normalize unreliable client events, process them safely, and aggregate them without double counting.</p>
        </div>
        <button className="secondary" onClick={() => refresh()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <main>
        <section className="stat-grid">
          <div className="stat-card"><span>Processed</span><strong>{stats.processed}</strong><small>Committed events</small></div>
          <div className="stat-card"><span>Rejected</span><strong>{stats.rejected}</strong><small>Invalid input</small></div>
          <div className="stat-card"><span>Failed</span><strong>{stats.failed}</strong><small>Retryable failures</small></div>
          <div className="stat-card"><span>Total amount</span><strong>{aggregation.totalAmount.toLocaleString()}</strong><small>{aggregation.eventCount} unique events</small></div>
        </section>

        <section className="grid">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Submit raw event</h2>
                <p>Send deliberately inconsistent client data through the normalization layer.</p>
              </div>
              <Send size={20} />
            </div>

            <textarea value={json} onChange={e => setJson(e.target.value)} spellCheck={false} />

            <label className="toggle">
              <input type="checkbox" checked={simulateFailure} onChange={e => setSimulateFailure(e.target.checked)} />
              <span className="toggle-ui"></span>
              <span><b>Simulate database failure</b><small>Forces a transaction failure before the event is committed.</small></span>
            </label>

            <button className="primary" onClick={submit} disabled={loading}>
              <Send size={16} /> {loading ? "Processing..." : "Process event"}
            </button>

            {message && <div className={`notice ${messageType}`}>{message}</div>}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Aggregation</h2>
                <p>Calculated only from successfully processed, unique events.</p>
              </div>
              <Database size={20} />
            </div>

            <div className="big-number">{aggregation.totalAmount.toLocaleString()}</div>
            <div className="metric-label">Total amount</div>

            <div className="metric-list">
              {aggregation.byMetric.length === 0 && <div className="empty">No processed events yet.</div>}
              {aggregation.byMetric.map(m => (
                <div className="metric-row" key={m.metric}>
                  <span>{m.metric}</span>
                  <b>{m.total_amount.toLocaleString()}</b>
                  <small>{m.event_count} events</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Event history</h2>
              <p>Raw payloads remain separate from canonical processed data.</p>
            </div>
            <ShieldCheck size={20} />
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Source</th><th>Status</th><th>Received</th><th>Details</th></tr></thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id}>
                    <td>#{event.id}</td>
                    <td>{event.source}</td>
                    <td>
                      <span className={`status ${event.status}`}>
                        {event.status === "processed" ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                        {event.status}
                      </span>
                    </td>
                    <td>{new Date(event.received_at).toLocaleString()}</td>
                    <td>{event.error_message || "Processed successfully"}</td>
                  </tr>
                ))}
                {events.length === 0 && <tr><td colSpan={5} className="empty">No events submitted yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer>
        <span>Atomic transactions</span><span>•</span><span>Deterministic idempotency</span><span>•</span><span>Raw data preserved</span>
      </footer>
    </div>
  );
}
