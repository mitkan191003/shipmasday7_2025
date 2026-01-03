"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--modal-overlay)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[20px] bg-[var(--surface)] p-6 shadow-[var(--shadow-elevation)]">
        <div className="flex items-center justify-between gap-4">
          {title ? (
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-[20px] px-3 py-1 text-sm font-semibold text-[var(--text-body)] shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)]"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
