// Session tokens, keyed by wallet address in localStorage.
//
// A tiny external store so the API client (plain functions) and React (via
// useSyncExternalStore) agree on who is signed in.

import { useSyncExternalStore } from "react";

const PREFIX = "tollgate:token:";
const keyFor = (addr: string) => PREFIX + addr.toLowerCase();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(addr: string): string | null {
  try {
    return localStorage.getItem(keyFor(addr));
  } catch {
    return null;
  }
}

export function getToken(addr: string | null | undefined): string | null {
  return addr ? read(addr) : null;
}

export function setToken(addr: string, token: string) {
  try {
    localStorage.setItem(keyFor(addr), token);
  } catch {
    /* storage blocked: the session just won't survive a reload */
  }
  emit();
}

export function clearToken(addr: string | null | undefined) {
  if (!addr) return;
  try {
    localStorage.removeItem(keyFor(addr));
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // another tab signing in/out should reflect here too
  const onStorage = (e: StorageEvent) => e.key?.startsWith(PREFIX) && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** The token for `addr`, re-rendering whenever any session changes. */
export function useToken(addr: string | undefined): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (addr ? read(addr) : null),
    () => null, // server render: nobody is signed in
  );
}
