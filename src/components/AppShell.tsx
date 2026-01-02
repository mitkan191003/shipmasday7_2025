"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JournalEntry, Park, ParkVisit } from "@/lib/parkTypes";
import { buildStateIndex } from "@/lib/parkUtils";
import { parkImages } from "@/data/parkImages";
import { supabase } from "@/lib/supabaseClient";
import AuthPanel from "@/components/AuthPanel";
import JournalPanel from "@/components/JournalPanel";
import Modal from "@/components/Modal";
import ParkMap from "@/components/ParkMap";

export default function AppShell({ parks }: { parks: Park[] }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [visits, setVisits] = useState<ParkVisit[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeParkId, setActiveParkId] = useState<string | null>(null);
  const [pendingPark, setPendingPark] = useState<Park | null>(null);
  const [confirmVisitOpen, setConfirmVisitOpen] = useState(false);
  const [congratsOpen, setCongratsOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mobileWarningOpen, setMobileWarningOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoReadOnlyOpen, setDemoReadOnlyOpen] = useState(false);
  const [mapFilter, setMapFilter] = useState<"all" | "visited" | "unvisited">("all");
  const entriesRef = useRef<JournalEntry[]>([]);
  const signedUrlExpirationsRef = useRef<Map<string, number>>(new Map());
  const signedUrlRefreshingRef = useRef<Set<string>>(new Set());
  const signedUrlTtlSeconds = 60 * 60 * 24;
  const signedUrlRefreshBufferSeconds = 10 * 60;
  const signedUrlRefreshIntervalMs = 15 * 60 * 1000;

  const setDemoModeEnabled = (enabled: boolean) => {
    setDemoMode(enabled);
    if (typeof window !== "undefined") {
      if (enabled) {
        window.sessionStorage.setItem("demo-mode", "true");
      } else {
        window.sessionStorage.removeItem("demo-mode");
      }
    }
  };

  const attachSignedUrls = async (entryData: JournalEntry[]) => {
    const signedEntries = await Promise.all(
      entryData.map(async (entry) => {
        if (!entry.image_path) {
          return entry;
        }
        const { data, error } = await supabase
          .storage
          .from("journal-images")
          .createSignedUrl(entry.image_path, signedUrlTtlSeconds);
        if (error || !data?.signedUrl) {
          return entry;
        }
        signedUrlExpirationsRef.current.set(
          entry.image_path,
          Date.now() + signedUrlTtlSeconds * 1000,
        );
        return { ...entry, image_url: data.signedUrl };
      }),
    );
    return signedEntries;
  };

  const refreshSignedUrlsForEntries = async (entriesToRefresh: JournalEntry[]) => {
    if (!entriesToRefresh.length) {
      return;
    }
    const refreshed = await Promise.all(
      entriesToRefresh.map(async (entry) => {
        if (!entry.image_path) {
          return null;
        }
        const { data, error } = await supabase
          .storage
          .from("journal-images")
          .createSignedUrl(entry.image_path, signedUrlTtlSeconds);
        if (error || !data?.signedUrl) {
          return null;
        }
        signedUrlExpirationsRef.current.set(
          entry.image_path,
          Date.now() + signedUrlTtlSeconds * 1000,
        );
        return { id: entry.id, imageUrl: data.signedUrl };
      }),
    );
    const updates = new Map<string, string>();
    refreshed.forEach((result) => {
      if (result) {
        updates.set(result.id, result.imageUrl);
      }
    });
    if (!updates.size) {
      return;
    }
    setEntries((current) =>
      current.map((entry) =>
        updates.has(entry.id) ? { ...entry, image_url: updates.get(entry.id) ?? entry.image_url } : entry,
      ),
    );
  };

  const refreshExpiringSignedUrls = async () => {
    const now = Date.now();
    const entriesToRefresh = entriesRef.current.filter((entry) => {
      if (!entry.image_path) {
        return false;
      }
      const expiresAt = signedUrlExpirationsRef.current.get(entry.image_path) ?? 0;
      return expiresAt - now <= signedUrlRefreshBufferSeconds * 1000;
    });
    await refreshSignedUrlsForEntries(entriesToRefresh);
  };

  const refreshEntrySignedUrl = async (entryId: string) => {
    if (signedUrlRefreshingRef.current.has(entryId)) {
      return;
    }
    const entry = entriesRef.current.find((item) => item.id === entryId);
    if (!entry?.image_path) {
      return;
    }
    signedUrlRefreshingRef.current.add(entryId);
    try {
      await refreshSignedUrlsForEntries([entry]);
    } finally {
      signedUrlRefreshingRef.current.delete(entryId);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email ?? null);
      setDemoModeEnabled(Boolean(session?.user.is_anonymous));
      setSessionReady(true);
    };

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email ?? null);
      setDemoModeEnabled(Boolean(session?.user.is_anonymous));
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.sessionStorage.getItem("mobile-warning-dismissed");
    if (dismissed) return;
    const isMobile =
      window.matchMedia("(max-width: 900px)").matches ||
      /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
    if (isMobile) {
      setMobileWarningOpen(true);
    }
  }, []);

  useEffect(() => {
    if (demoMode) {
      const loadDemoData = async () => {
        const [{ data: visitData }, { data: entryData }] = await Promise.all([
          supabase.from("demo_park_visits").select("id, park_id, first_visited_at, created_at"),
          supabase
            .from("demo_journal_entries")
            .select("id, park_id, visit_date, notes, image_url, image_path, created_at")
            .order("visit_date", { ascending: false }),
        ]);
        setVisits(visitData ?? []);
        setEntries(entryData ?? []);
      };

      loadDemoData();
      return;
    }

    if (!userId) {
      setVisits([]);
      setEntries([]);
      return;
    }

    const loadUserData = async () => {
      const [{ data: visitData }, { data: entryData }] = await Promise.all([
        supabase
          .from("park_visits")
          .select("id, park_id, first_visited_at, created_at")
          .eq("user_id", userId),
        supabase
          .from("journal_entries")
          .select("id, park_id, visit_date, notes, image_url, image_path, created_at")
          .eq("user_id", userId)
          .order("visit_date", { ascending: false }),
      ]);
      setVisits(visitData ?? []);
      const signedEntries = await attachSignedUrls(entryData ?? []);
      setEntries(signedEntries);
    };

    loadUserData();
  }, [userId, demoMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!entries.some((entry) => entry.image_path)) {
      return;
    }
    const refreshInterval = window.setInterval(() => {
      void refreshExpiringSignedUrls();
    }, signedUrlRefreshIntervalMs);
    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [entries, signedUrlRefreshIntervalMs]);

  const visitedIds = useMemo(() => new Set(visits.map((visit) => visit.park_id)), [visits]);
  const parksForMap = useMemo(() => {
    if (mapFilter === "visited") {
      return parks.filter((park) => visitedIds.has(park.id));
    }
    if (mapFilter === "unvisited") {
      return parks.filter((park) => !visitedIds.has(park.id));
    }
    return parks;
  }, [parks, visitedIds, mapFilter]);
  const activePark = parks.find((park) => park.id === activeParkId) ?? null;
  const entriesForActive = entries.filter((entry) => entry.park_id === activeParkId);
  const stateIndex = useMemo(() => buildStateIndex(parks), [parks]);
  const stateList = useMemo(() => Array.from(stateIndex.keys()).sort(), [stateIndex]);
  const selectedStateParks = selectedState ? stateIndex.get(selectedState) ?? [] : [];

  const handleSelectPark = (park: Park) => {
    if (visitedIds.has(park.id)) {
      setActiveParkId(park.id);
      return;
    }
    setStatusMessage(null);
    setPendingPark(park);
    setConfirmVisitOpen(true);
  };

  const handleConfirmVisit = async () => {
    if (!pendingPark || !userId) return;
    if (demoMode) {
      setConfirmVisitOpen(false);
      setDemoReadOnlyOpen(true);
      return;
    }
    setStatusMessage(null);
    const firstVisited = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("park_visits")
      .insert({ user_id: userId, park_id: pendingPark.id, first_visited_at: firstVisited })
      .select("id, park_id, first_visited_at, created_at")
      .single();

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    if (data) {
      setVisits((current) => [...current, data]);
    }
    setActiveParkId(pendingPark.id);
    setPendingPark(null);
    setConfirmVisitOpen(false);
    setCongratsOpen(true);
  };

  const handleCreateEntry = async (payload: {
    parkId: string;
    visitDate: string;
    notes: string;
    imageFile: File | null;
  }) => {
    if (!userId) return;
    if (demoMode) {
      setDemoReadOnlyOpen(true);
      throw new Error("DEMO_READ_ONLY");
    }
    let imageUrl: string | null = null;
    let imagePath: string | null = null;

    if (payload.imageFile) {
      const extension = payload.imageFile.name.split(".").pop() || "jpg";
      imagePath = `${userId}/${payload.parkId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase
        .storage
        .from("journal-images")
        .upload(imagePath, payload.imageFile, {
          contentType: payload.imageFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedData, error: signedError } = await supabase
        .storage
        .from("journal-images")
        .createSignedUrl(imagePath, signedUrlTtlSeconds);
      if (!signedError) {
        imageUrl = signedData?.signedUrl ?? null;
        if (imagePath && imageUrl) {
          signedUrlExpirationsRef.current.set(
            imagePath,
            Date.now() + signedUrlTtlSeconds * 1000,
          );
        }
      }
    }

    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        park_id: payload.parkId,
        visit_date: payload.visitDate,
        notes: payload.notes,
        image_url: null,
        image_path: imagePath,
      })
      .select("id, park_id, visit_date, notes, image_url, image_path, created_at")
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      const nextEntry = imageUrl ? { ...data, image_url: imageUrl } : data;
      setEntries((current) => [nextEntry, ...current]);
    }
  };

  if (!sessionReady) {
    return null;
  }

  if (!userId) {
    return (
      <>
        <AuthPanel onAuthed={() => setSessionReady(true)} onDemoStart={() => setDemoModeEnabled(true)} />
        <Modal
          open={mobileWarningOpen}
          title="Heads up"
          onClose={() => {
            setMobileWarningOpen(false);
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("mobile-warning-dismissed", "true");
            }
          }}
        >
          <p className="text-sm text-slate-600">
            This experience is not optimized for mobile yet. For the best map and journaling flow, please use a desktop
            or larger screen.
          </p>
          <button
            type="button"
            onClick={() => {
              setMobileWarningOpen(false);
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem("mobile-warning-dismissed", "true");
              }
            }}
            className="mt-4 rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
          >
            Got it
          </button>
        </Modal>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f1e8,_#e7eef5_45%,_#dde6f1)] px-6 pb-12 text-slate-800">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 py-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Trailkeeper</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-800">National Park Journal</h1>
          <p className="mt-2 text-sm text-slate-500">
            Track visits, celebrate firsts, and keep the memories flowing.
          </p>
        </div>
        <div className="rounded-[28px] bg-[var(--surface)] px-4 py-3 shadow-[14px_14px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)]">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {demoMode ? "Demo session" : "Signed in"}
          </p>
          <p className="text-sm font-semibold text-slate-700">{demoMode ? "Read-only demo" : userEmail}</p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              setDemoModeEnabled(false);
            }}
            className="mt-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,_1.2fr)_minmax(0,_0.8fr)]">
        <section className="space-y-6">
          <div className="rounded-[32px] bg-[var(--surface)] p-6 shadow-[18px_18px_38px_var(--shadow-dark),-18px_-18px_38px_var(--shadow-light)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Explore</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-800">Park map</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Hover for park snapshots, click a marker to visit, or tap a state label to browse its list.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]">
                  {visits.length} parks visited
                </div>
                <div className="rounded-[28px] bg-white/70 px-3 py-2 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Filters</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMapFilter("visited")}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        mapFilter === "visited"
                          ? "bg-amber-300 text-slate-900"
                          : "bg-white/80 text-slate-600"
                      } shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]`}
                    >
                      Visited park
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilter("unvisited")}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        mapFilter === "unvisited"
                          ? "bg-amber-300 text-slate-900"
                          : "bg-white/80 text-slate-600"
                      } shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]`}
                    >
                      Unvisited park
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilter("all")}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        mapFilter === "all"
                          ? "bg-amber-300 text-slate-900"
                          : "bg-white/80 text-slate-600"
                      } shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]`}
                    >
                      All parks
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <ParkMap
                parks={parksForMap}
                visitedIds={visitedIds}
                activeState={selectedState}
                onSelectPark={handleSelectPark}
                onSelectState={(state) => setSelectedState(state)}
                parkImages={parkImages}
              />
            </div>
          </div>

          <div className="rounded-[32px] bg-[var(--surface)] p-6 shadow-[18px_18px_38px_var(--shadow-dark),-18px_-18px_38px_var(--shadow-light)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">States</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-800">Browse by state</h3>
              </div>
              {selectedState ? (
                <button
                  type="button"
                  onClick={() => setSelectedState(null)}
                  className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
                >
                  Clear selection
                </button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {stateList.map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => setSelectedState(state)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    selectedState === state
                      ? "bg-amber-300 text-slate-900"
                      : "bg-white/70 text-slate-600"
                  } shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]`}
                >
                  {state}
                </button>
              ))}
            </div>
            {selectedState ? (
              <div className="mt-6 rounded-3xl bg-[var(--surface-alt)] p-4 shadow-[inset_8px_8px_18px_var(--shadow-dark),inset_-8px_-8px_18px_var(--shadow-light)]">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {selectedState} parks
                </h4>
                <div className="mt-3 grid gap-2">
                  {selectedStateParks.map((park) => (
                    <button
                      key={park.id}
                      type="button"
                      onClick={() => handleSelectPark(park)}
                      className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
                    >
                      <span>{park.name}</span>
                      <span className="text-xs text-slate-400">{park.city}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <JournalPanel
            park={activePark}
            entries={entriesForActive}
            visited={activePark ? visitedIds.has(activePark.id) : false}
            onCreateEntry={handleCreateEntry}
            onRefreshEntryImage={refreshEntrySignedUrl}
          />
        </aside>
      </main>

      <Modal
        open={confirmVisitOpen}
        title={pendingPark ? `First visit to ${pendingPark.name}?` : "Confirm visit"}
        onClose={() => {
          setConfirmVisitOpen(false);
          setPendingPark(null);
        }}
      >
        <p className="text-sm text-slate-600">
          Mark this park as visited to unlock its journal timeline.
        </p>
        {statusMessage ? <p className="mt-3 text-sm text-amber-700">{statusMessage}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConfirmVisit}
            className="rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
          >
            Yes, I visited
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmVisitOpen(false);
              setPendingPark(null);
            }}
            className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
          >
            Not yet
          </button>
        </div>
      </Modal>

      <Modal open={congratsOpen} title="Congratulations!" onClose={() => setCongratsOpen(false)}>
        <p className="text-sm text-slate-600">
          New park unlocked. Add your first journal entry while the memory is fresh.
        </p>
        <button
          type="button"
          onClick={() => setCongratsOpen(false)}
          className="mt-4 rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
        >
          Start journaling
        </button>
      </Modal>

      <Modal
        open={demoReadOnlyOpen}
        title="Demo is read-only"
        onClose={() => setDemoReadOnlyOpen(false)}
      >
        <p className="text-sm text-slate-600">
          This demo profile is locked. Create an account to add visits or journal entries.
        </p>
        <button
          type="button"
          onClick={() => setDemoReadOnlyOpen(false)}
          className="mt-4 rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
        >
          Got it
        </button>
      </Modal>

      <Modal
        open={mobileWarningOpen}
        title="Heads up"
        onClose={() => {
          setMobileWarningOpen(false);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("mobile-warning-dismissed", "true");
          }
        }}
      >
        <p className="text-sm text-slate-600">
          This experience is not optimized for mobile yet. For the best map and journaling flow, please use a desktop
          or larger screen.
        </p>
        <button
          type="button"
          onClick={() => {
            setMobileWarningOpen(false);
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("mobile-warning-dismissed", "true");
            }
          }}
          className="mt-4 rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
        >
          Got it
        </button>
      </Modal>
    </div>
  );
}
