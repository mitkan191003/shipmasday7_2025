"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { JournalEntry, Park } from "@/lib/parkTypes";
import Modal from "@/components/Modal";

type JournalPanelProps = {
  park: Park | null;
  entries: JournalEntry[];
  visited: boolean;
  onCreateEntry: (payload: {
    parkId: string;
    visitDate: string;
    notes: string;
    imageFile: File | null;
  }) => Promise<void>;
};

const imageQuotes = [
  "One pic to rule them all. Choose wisely.",
  "You only get to add one pic so make sure it's the one with your eyes open!",
  "Pick the hero shot. The rest live in your camera roll.",
  "This is your park's cover art. Make it iconic.",
  "One image. Infinite bragging rights.",
];

export default function JournalPanel({ park, entries, visited, onCreateEntry }: JournalPanelProps) {
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.visit_date.localeCompare(a.visit_date));
  }, [entries]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const handleFileSelect = (file: File | null) => {
    setImageFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!park) return;
    setSaving(true);
    setMessage(null);
    try {
      await onCreateEntry({
        parkId: park.id,
        visitDate,
        notes,
        imageFile,
      });
      setNotes("");
      handleFileSelect(null);
      setVisitDate(new Date().toISOString().slice(0, 10));
      setMessage("Entry added to the timeline.");
    } catch (error) {
      setMessage("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (!park) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[32px] bg-[var(--surface)] p-8 text-center shadow-[18px_18px_38px_var(--shadow-dark),-18px_-18px_38px_var(--shadow-light)]">
        <Image src="/icons/mountain.svg" alt="Mountain" width={48} height={48} />
        <h2 className="mt-4 text-2xl font-semibold text-slate-700">Pick a park to start journaling</h2>
        <p className="mt-2 text-sm text-slate-500">
          Tap any marker or state label to open the timeline. First visits unlock a celebratory moment.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] bg-[var(--surface)] p-6 shadow-[18px_18px_38px_var(--shadow-dark),-18px_-18px_38px_var(--shadow-light)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Journal</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-800">{park.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {park.states.join(" / ")} - {park.city}
          </p>
        </div>
        <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]">
          {visited ? "Visited" : "Unvisited"}
        </div>
      </div>

      <div className="mt-6 border-l-2 border-dashed border-slate-300/70 pl-6">
        <div className="relative mb-6 rounded-3xl bg-[var(--surface-alt)] p-4 shadow-[inset_8px_8px_18px_var(--shadow-dark),inset_-8px_-8px_18px_var(--shadow-light)]">
          <div className="absolute -left-[29px] top-6 h-4 w-4 rounded-full bg-amber-300 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]" />
          <h3 className="text-sm font-semibold text-slate-700">New visit entry</h3>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Visit date
              <input
                type="date"
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-transparent bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Notes
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What did you see, smell, or feel?"
                className="mt-2 w-full rounded-2xl border border-transparent bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setImageModalOpen(true)}
                className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
              >
                {imageFile ? "Replace image" : "Add one image"}
              </button>
              {imageFile ? (
                <span className="text-xs text-slate-500">{imageFile.name}</span>
              ) : (
                <span className="text-xs text-slate-400">No image selected</span>
              )}
            </div>
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Selected preview"
                className="h-32 w-full rounded-2xl object-cover"
              />
            ) : null}
            {message ? <p className="text-xs text-amber-700">{message}</p> : null}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)] transition hover:brightness-95 disabled:opacity-60"
            >
              {saving ? "Saving entry..." : "Add to timeline"}
            </button>
          </form>
        </div>

        {sortedEntries.length === 0 ? (
          <p className="text-sm text-slate-500">No journal entries yet. Capture your first memory above.</p>
        ) : (
          <div className="space-y-5">
            {sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="relative rounded-3xl bg-[var(--surface-alt)] p-4 shadow-[inset_8px_8px_18px_var(--shadow-dark),inset_-8px_-8px_18px_var(--shadow-light)]"
              >
                <div className="absolute -left-[29px] top-6 h-4 w-4 rounded-full bg-slate-300 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]" />
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span>{entry.visit_date}</span>
                  <span>Journal</span>
                </div>
                {entry.image_url ? (
                  <img
                    src={entry.image_url}
                    alt="Journal entry"
                    className="mt-3 h-32 w-full rounded-2xl object-cover"
                  />
                ) : null}
                {entry.notes ? <p className="mt-3 text-sm text-slate-600">{entry.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={imageModalOpen} title="Pick your single photo" onClose={() => setImageModalOpen(false)}>
        <ul className="space-y-2 text-sm text-slate-600">
          {imageQuotes.map((quote) => (
            <li key={quote} className="rounded-2xl bg-white/70 px-4 py-2 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
              {quote}
            </li>
          ))}
        </ul>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Choose one image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              handleFileSelect(file);
              if (file) {
                setImageModalOpen(false);
              }
            }}
            className="mt-2 w-full rounded-2xl border border-transparent bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
          />
        </label>
      </Modal>
    </div>
  );
}
