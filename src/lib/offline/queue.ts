"use client";
/**
 * Offline queue. Quick entries (one-tap foods, water, weight) that cannot reach
 * the server are kept on the phone and sent as soon as there is a connection
 * again. Each entry remembers which user created it, so nothing is ever sent
 * for a different account on the same phone.
 */
import { changeWater, quickLog } from "@/app/(app)/nutrition/actions";
import { saveWeightValues } from "@/app/(app)/body/actions";

type Payloads = {
  quickLog: Parameters<typeof quickLog>[0] & { name: string };
  water: { date: string; ml: number };
  weight: { date: string; weight_kg: number };
};
export type QueueKind = keyof Payloads;

export interface QueuedItem<K extends QueueKind = QueueKind> {
  id: string;
  user: string;
  kind: K;
  payload: Payloads[K];
  created: string;
}

const KEY = "sigma.offline-queue.v1";
const USER_KEY = "sigma.user";
export const QUEUE_EVENT = "sigma-queue-change";

function read(): QueuedItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(items: QueuedItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked: nothing we can do */
  }
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function setQueueUser(userId: string) {
  try {
    localStorage.setItem(USER_KEY, userId);
  } catch {
    /* ignore */
  }
}

function currentUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

/** Waiting entries of the signed-in user. */
export function pending(): QueuedItem[] {
  const user = currentUser();
  return read().filter((i) => i.user === user);
}

async function send(item: QueuedItem): Promise<{ ok: boolean }> {
  switch (item.kind) {
    case "quickLog": {
      const { name: _name, ...p } = item.payload as Payloads["quickLog"];
      void _name;
      return quickLog(p);
    }
    case "water": {
      const p = item.payload as Payloads["water"];
      return changeWater(p.date, p.ml);
    }
    case "weight": {
      const p = item.payload as Payloads["weight"];
      return saveWeightValues(p);
    }
  }
}

function enqueue<K extends QueueKind>(kind: K, payload: Payloads[K]) {
  const user = currentUser();
  if (!user) return false;
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
  write([...read(), { id, user, kind, payload, created: new Date().toISOString() }]);
  return true;
}

export type RunResult = { ok: true; queued: boolean } | { ok: false };

/**
 * Sends an entry now, or keeps it for later when the phone is offline (or the
 * request fails because there is no connection). A server-side "no" (e.g.
 * invalid input) is NOT queued, it is reported as a failure.
 */
export async function runOrQueue<K extends QueueKind>(kind: K, payload: Payloads[K]): Promise<RunResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return enqueue(kind, payload) ? { ok: true, queued: true } : { ok: false };
  try {
    const res = await send({ id: "", user: "", kind, payload, created: "" } as QueuedItem);
    return res.ok ? { ok: true, queued: false } : { ok: false };
  } catch {
    // fetch failed: no connection (or the server is unreachable)
    return enqueue(kind, payload) ? { ok: true, queued: true } : { ok: false };
  }
}

let flushing = false;

/** Sends all waiting entries of the signed-in user. Returns how many were sent. */
export async function flush(): Promise<number> {
  if (flushing || (typeof navigator !== "undefined" && navigator.onLine === false)) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of pending()) {
      try {
        await send(item);
        // sent, or refused by the server (would fail forever): remove either way
        sent += 1;
        write(read().filter((i) => i.id !== item.id));
      } catch {
        break; // still offline: try again later
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}
