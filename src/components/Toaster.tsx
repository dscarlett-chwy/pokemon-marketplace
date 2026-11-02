"use client";

import { useEffect } from "react";
import { useNotice } from "@/store/notice";

export function Toaster() {
  const notice = useNotice((s) => s.notice);
  const clear = useNotice((s) => s.clear);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clear, notice.tone === "error" ? 7000 : 4000);
    return () => clearTimeout(timer);
  }, [notice, clear]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {notice && (
        <p
          key={notice.id}
          className={`pointer-events-auto rounded-md px-4 py-3 text-base font-semibold text-white shadow-[0_6px_0_var(--color-cardback-deep)] ${
            notice.tone === "error" ? "bg-decline" : "bg-cardback"
          }`}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}
