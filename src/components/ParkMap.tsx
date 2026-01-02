"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import type { Park, ParkImageMap } from "@/lib/parkTypes";

type ParkMapProps = {
  parks: Park[];
  visitedIds: Set<string>;
  activeState: string | null;
  onSelectPark: (park: Park) => void;
  onSelectState: (state: string) => void;
  parkImages: ParkImageMap;
};

type HoverCard = {
  park: Park;
  x: number;
  y: number;
};

type MapPanelProps = {
  title?: string;
  subtitle?: string;
  parks: Park[];
  visitedIds: Set<string>;
  activeState: string | null;
  onSelectPark: (park: Park) => void;
  onSelectState: (state: string) => void;
  parkImages: ParkImageMap;
  geographyFilter?: (name: string) => boolean;
  projection: "geoAlbersUsa" | "geoMercator";
  projectionConfig: Record<string, number | [number, number]>;
  width?: number;
  height?: number;
  mapClassName?: string;
  className?: string;
  resolveStateName: (name: string) => string;
};

const mapUrl = "/map/us-states-10m.json";

const mapNameOverrides: Record<string, string> = {
  "United States Virgin Islands": "U.S. Virgin Islands",
};

const resolveStateName = (name: string) => mapNameOverrides[name] ?? name;

const territoryStates = new Set(["American Samoa", "U.S. Virgin Islands", "United States Virgin Islands"]);
const territoryMapNames = new Set(["American Samoa", "United States Virgin Islands"]);

function MapPanel({
  title,
  subtitle,
  parks,
  visitedIds,
  activeState,
  onSelectPark,
  onSelectState,
  parkImages,
  geographyFilter,
  projection,
  projectionConfig,
  width,
  height,
  mapClassName,
  className,
  resolveStateName: resolveName,
}: MapPanelProps) {
  const [hovered, setHovered] = useState<HoverCard | null>(null);

  const handleMarkerHover = (event: React.MouseEvent<SVGGElement>, park: Park) => {
    const targetRect = event.currentTarget.getBoundingClientRect();
    const x = targetRect.left + targetRect.width / 2;
    const y = targetRect.top + targetRect.height / 2;
    setHovered({ park, x, y });
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[32px] bg-[var(--surface-alt)] p-4 shadow-[inset_10px_10px_22px_var(--shadow-dark),inset_-10px_-10px_22px_var(--shadow-light)] ${
        className ?? ""
      }`}
    >
      {title ? (
        <div className="absolute left-5 top-4 rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {title}
        </div>
      ) : null}
      {subtitle ? (
        <div className="absolute right-5 top-4 rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {subtitle}
        </div>
      ) : null}
      <ComposableMap
        projection={projection}
        projectionConfig={projectionConfig}
        width={width}
        height={height}
        className={mapClassName ?? "h-auto w-full"}
      >
        <defs>
          <radialGradient id="parkGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="var(--map-marker-start)" />
            <stop offset="55%" stopColor="var(--map-marker-mid)" />
            <stop offset="100%" stopColor="var(--map-marker-end)" />
          </radialGradient>
        </defs>
        <Geographies geography={mapUrl}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; properties?: { name?: string } }> }) =>
            geographies
              .filter((geo) => {
                const name = String(geo.properties?.name ?? "");
                return geographyFilter ? geographyFilter(name) : true;
              })
              .map((geo) => {
                const stateName = String(geo.properties?.name ?? "");
                const resolvedName = resolveName(stateName);
                const isActive = activeState === resolvedName;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => resolvedName && onSelectState(resolvedName)}
                    className="outline-none"
                    style={{
                      default: {
                        fill: isActive ? "var(--map-land-active)" : "var(--map-land)",
                        stroke: "var(--map-stroke)",
                        strokeWidth: 0.6,
                      },
                      hover: {
                        fill: "var(--map-land-hover)",
                        stroke: "var(--map-stroke)",
                        strokeWidth: 0.6,
                      },
                      pressed: {
                        fill: "var(--map-land-active)",
                        stroke: "var(--map-stroke)",
                        strokeWidth: 0.6,
                      },
                    }}
                  />
                );
              })
          }
        </Geographies>

        {parks.map((park) => {
          const isVisited = visitedIds.has(park.id);
          return (
            <Marker key={park.id} coordinates={[park.longitude, park.latitude]}>
              <g
                onClick={() => onSelectPark(park)}
                onMouseEnter={(event) => handleMarkerHover(event, park)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                <circle r={16} fill={isVisited ? "var(--map-marker-visited)" : "url(#parkGradient)"} />
                <image
                  href="/icons/park-marker.svg"
                  x={-10}
                  y={-10}
                  width={20}
                  height={20}
                  style={{
                    opacity: isVisited ? 0.55 : 1,
                    filter: isVisited ? "grayscale(1)" : "none",
                  }}
                />
                {isVisited ? (
                  <image
                    href="/icons/checkmark.svg"
                    x={6}
                    y={-16}
                    width={12}
                    height={12}
                    style={{ filter: "var(--checkmark-filter)" }}
                  />
                ) : null}
              </g>
            </Marker>
          );
        })}
      </ComposableMap>

      {hovered && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[9999] w-56 -translate-y-1/2 rounded-3xl bg-[var(--surface)] p-3 text-left shadow-[14px_14px_30px_var(--shadow-dark),-14px_-14px_30px_var(--shadow-light)]"
              style={{ left: hovered.x + 16, top: hovered.y - 6 }}
            >
              {parkImages[hovered.park.id] ? (
                <img
                  src={parkImages[hovered.park.id]}
                  alt={hovered.park.name}
                  className="h-24 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="h-24 w-full rounded-2xl park-card-gradient" />
              )}
              <div className="mt-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{hovered.park.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{hovered.park.states.join(" / ")}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function ParkMap({
  parks,
  visitedIds,
  activeState,
  onSelectPark,
  onSelectState,
  parkImages,
}: ParkMapProps) {
  const getCenterFromParks = (parksForCenter: Park[], fallback: [number, number]) => {
    if (!parksForCenter.length) {
      return fallback;
    }
    const totals = parksForCenter.reduce(
      (acc, park) => ({ lat: acc.lat + park.latitude, lon: acc.lon + park.longitude }),
      { lat: 0, lon: 0 },
    );
    const count = parksForCenter.length || 1;
    return [totals.lon / count, totals.lat / count] as [number, number];
  };

  const mappableParks = useMemo(
    () => parks.filter((park) => Number.isFinite(park.latitude) && Number.isFinite(park.longitude)),
    [parks],
  );

  const americanSamoaAllParks = useMemo(
    () => parks.filter((park) => park.states.includes("American Samoa")),
    [parks],
  );

  const virginIslandsAllParks = useMemo(
    () =>
      parks.filter(
        (park) =>
          park.states.includes("U.S. Virgin Islands") || park.states.includes("United States Virgin Islands"),
      ),
    [parks],
  );

  const mainMapParks = useMemo(
    () => mappableParks.filter((park) => !park.states.some((state) => territoryStates.has(state))),
    [mappableParks],
  );

  const americanSamoaParks = useMemo(
    () => mappableParks.filter((park) => park.states.includes("American Samoa")),
    [mappableParks],
  );

  const virginIslandsParks = useMemo(
    () =>
      mappableParks.filter(
        (park) => park.states.includes("U.S. Virgin Islands") || park.states.includes("United States Virgin Islands"),
      ),
    [mappableParks],
  );

  const americanSamoaCenter = useMemo(
    () => getCenterFromParks(americanSamoaParks, [-170.7, -14.3]),
    [americanSamoaParks],
  );

  const virginIslandsCenter = useMemo(
    () => getCenterFromParks(virginIslandsParks, [-64.8, 18.3]),
    [virginIslandsParks],
  );

  return (
    <div className="space-y-4">
      <MapPanel
        parks={mainMapParks}
        visitedIds={visitedIds}
        activeState={activeState}
        onSelectPark={onSelectPark}
        onSelectState={onSelectState}
        parkImages={parkImages}
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1100 }}
        geographyFilter={(name) => !territoryMapNames.has(name)}
        resolveStateName={resolveStateName}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <MapPanel
          title="American Samoa"
          subtitle={`${americanSamoaAllParks.length} ${americanSamoaAllParks.length === 1 ? "park" : "parks"}`}
          parks={americanSamoaParks}
          visitedIds={visitedIds}
          activeState={activeState}
          onSelectPark={onSelectPark}
          onSelectState={onSelectState}
          parkImages={parkImages}
          projection="geoMercator"
          projectionConfig={{ center: americanSamoaCenter, scale: 36000, translate: [210, 110] }}
          geographyFilter={(name) => name === "American Samoa"}
          resolveStateName={resolveStateName}
          width={420}
          height={220}
          mapClassName="h-56 w-full"
        />
        <MapPanel
          title="U.S. Virgin Islands"
          subtitle={`${virginIslandsAllParks.length} ${virginIslandsAllParks.length === 1 ? "park" : "parks"}`}
          parks={virginIslandsParks}
          visitedIds={visitedIds}
          activeState={activeState}
          onSelectPark={onSelectPark}
          onSelectState={onSelectState}
          parkImages={parkImages}
          projection="geoMercator"
          projectionConfig={{ center: virginIslandsCenter, scale: 80000, translate: [210, 110] }}
          geographyFilter={(name) => name === "United States Virgin Islands"}
          resolveStateName={resolveStateName}
          width={420}
          height={220}
          mapClassName="h-56 w-full"
        />
      </div>
    </div>
  );
}
