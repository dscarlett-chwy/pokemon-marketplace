"use client";

import { create } from "zustand";

type Notice = { id: number; text: string; tone: "done" | "error" };

export const useNotice = create<{ notice: Notice | null; show: (text: string, tone?: Notice["tone"]) => void; clear: () => void }>(
  (set) => ({
    notice: null,
    show: (text, tone = "done") => set({ notice: { id: Date.now(), text, tone } }),
    clear: () => set({ notice: null }),
  }),
);
