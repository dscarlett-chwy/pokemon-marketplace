"use client";

import { useNotice } from "@/store/notice";

export function CopyLinkButton({ path, label = "Copy profile link" }: { path: string; label?: string }) {
  const show = useNotice((s) => s.show);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      show("Link copied");
    } catch {
      show("Couldn't copy the link. Copy it from the address bar instead.", "error");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full border border-ink/25 px-4 py-2 text-sm font-semibold text-ink hover:border-ink hover:bg-ink hover:text-paper"
    >
      {label}
    </button>
  );
}
