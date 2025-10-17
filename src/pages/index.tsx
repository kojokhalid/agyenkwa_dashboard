import DefaultLayout from "@/layouts/default";
import React from "react";
import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  
} from "@heroui/table";
// No UI imports required for actions; using simple cells for stress fields


export const columns = [
  { name: "NAME", uid: "name" },
  { name: "STRESS LEVEL", uid: "stress_level" },
  // { name: "STRESS STATUS", uid: "stress_status" },
  { name: "TIMESTAMP", uid: "timestamp" },
];
// removed action icons — table focuses on stress fields only

// statusColorMap removed — we display raw stress status text instead

const TTN_APPLICATION_ID = "mo-lora-lora-no";
const TTN_API_KEY = "NNSXS.AIEQECWKQPVAPNRFKKDWJX3RXBQ2A5VWLNETOCI.6UOIMQHT65CJ3OX23OWXEM2OLOJ6SVUHDDPFHW35TY3PYMKQXPDA";
const TTN_BASE_URL = `https://eu1.cloud.thethings.network/api/v3/as/applications/${TTN_APPLICATION_ID}/packages/storage/uplink_message`;

export default function IndexPage() {
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);

  const renderCell = React.useCallback((user: any, columnKey: string): React.ReactNode => {
    const decoded = user.decoded_payload || {};

    switch (columnKey) {
      case "name":
        return (
          <div className="flex items-center gap-2">
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
            <div className="flex flex-col">
              <p className="text-bold text-sm">{user.name}</p>
              <p className="text-sm text-default-400">{user.email}</p>
            </div>
          </div>
        );
      case "stress_level": {
        const lvl = decoded.stress_level ?? user.raw ?? null;
        const level = Number(lvl);
        const colorClass = (() => {
          switch (level) {
            case 1:
              return "bg-green-100 text-green-800";
            case 2:
              return "bg-yellow-100 text-yellow-800";
            case 3:
              return "bg-orange-100 text-orange-800";
            case 4:
              return "bg-red-100 text-red-800";
            default:
              return "bg-gray-100 text-gray-800";
          }
        })();

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium ${colorClass}`}>
            {Number.isNaN(level) || level === 0 ? "-" : level}
          </span>
        );
      }
      case "stress_status":
        return decoded.stress_status ?? "-";
      case "timestamp": {
        const raw = decoded.timestamp_iso ?? user.received_at ?? decoded.timestamp ?? null;
        // helper to format a variety of timestamp shapes
        const formatTimestamp = (v: any) => {
          if (!v && v !== 0) return "-";
          // numeric (seconds or milliseconds)
          if (typeof v === "number") {
            // if it's likely seconds (10 digits) convert to ms
            const millis = v > 1e12 ? v : v * 1000;
            const d = new Date(millis);
            if (!isNaN(d.getTime())) return d.toLocaleString();
            return String(v);
          }
          if (typeof v === "string") {
            // pure digits?
            if (/^\d+$/.test(v)) {
              const num = Number(v);
              const millis = num > 1e12 ? num : num * 1000;
              const d = new Date(millis);
              if (!isNaN(d.getTime())) return d.toLocaleString();
            }
            // try ISO parse
            const parsed = Date.parse(v);
            if (!isNaN(parsed)) return new Date(parsed).toLocaleString();
            return v;
          }
          return String(v);
        };

        return formatTimestamp(raw);
      }
      default:
        return user[columnKey] ?? "-";
    }
  }, []);

  // Parse NDJSON helper (simple)
  function parseNdjson(text: string) {
    const out: any[] = [];
    text.split(/\r?\n/).forEach((line) => {
      line = line.trim();
      if (!line) return;
      try {
        out.push(JSON.parse(line));
      } catch (e) {
        // ignore parse errors for individual lines
      }
    });
    return out;
  }

  async function fetchUplinks() {
  // start fetch
    try {
      const params = new URLSearchParams({ last: "24h", limit: "50" });
      const res = await fetch(`${TTN_BASE_URL}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${TTN_API_KEY}`,
          Accept: "text/event-stream, application/x-ndjson, application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn("TTN fetch failed", res.status);
  // end fetch (no loading state rendered)
        return;
      }

      const text = await res.text();
      // Try NDJSON first
      let messages: any[] = parseNdjson(text);
      if (messages.length === 0) {
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) messages = json;
          else if (json && json.result) messages = json.result;
          else messages = [json];
        } catch (e) {
          // nothing
        }
      }

      // Map messages to rows matching 'users' shape
      const mapped = messages.map((m: any, idx: number) => {
        const result = m.result || m;
        const uplink = result.uplink_message || result;
        const ids = result.end_device_ids || {};
        const decoded = uplink.decoded_payload || {};
        return {
          id: `ttn-${ids.device_id || idx}`,
          name: ids.device_id || `device-${idx}`,
          role: decoded.stress_status || "unknown",
          team: decoded ? JSON.stringify(decoded) : "",
          status: decoded && decoded.stress_status ? decoded.stress_status.toLowerCase() : "active",
          age: "-",
          avatar: "https://i.pravatar.cc/150?u=ttn", // placeholder
          email: ids.dev_eui || "",
          raw: uplink.frm_payload,
          received_at: uplink.received_at,
          decoded_payload: decoded,
        };
      });

      setRemoteUsers(mapped);
    } catch (e) {
      console.error("fetchUplinks error", e);
    } finally {
      // no-op
    }
  }

  // Poll every 10s for near-real-time updates
  useEffect(() => {
    fetchUplinks();
    const id = setInterval(fetchUplinks, 10000);
    return () => clearInterval(id);
  }, []);

  // We render only remoteUsers (no static data)

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <Table aria-label="Example table with custom cells">
      <TableHeader columns={columns}>
        {(column) => (
          <TableColumn key={column.uid} align={column.uid === "actions" ? "center" : "start"}>
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody items={remoteUsers}>
        {(item: any) => (
          <TableRow key={item.id}>
            {(columnKey: string | number) => <TableCell>{renderCell(item, String(columnKey))}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </Table>
      </section>
    </DefaultLayout>
  );
}
