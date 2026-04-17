"use client";

const KEY = "hks:anonymous_user_id";

export function getAnonymousUserId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = `anon_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
