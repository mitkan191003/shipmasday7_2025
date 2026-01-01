import "server-only";
import fs from "fs";
import path from "path";
import type { Park, RegionKey } from "@/lib/parkTypes";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizeState = (state: string) => state.trim();

const getRegion = (states: string[]): RegionKey => {
  const normalized = states.map((state) => state.toLowerCase());
  if (normalized.includes("alaska")) {
    return "alaska";
  }
  if (normalized.includes("hawaii")) {
    return "hawaii";
  }
  if (
    normalized.some((state) =>
      ["american samoa", "u.s. virgin islands", "virgin islands", "puerto rico", "guam"].includes(
        state,
      ),
    )
  ) {
    return "territories";
  }
  return "lower48";
};

export const loadParks = (): Park[] => {
  const filePath = path.join(process.cwd(), "parks.csv");
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const [, ...rows] = lines;
  const seen = new Map<string, number>();
  return rows.map((line) => {
      const [name, city, stateRaw, latRaw, lonRaw] = line.split(",").map((part) => part.trim());
      const states = stateRaw
        .split("/")
        .map(normalizeState)
        .filter(Boolean);
      const baseId = slugify(name);
      const count = (seen.get(baseId) ?? 0) + 1;
      seen.set(baseId, count);

      const latText = latRaw?.trim() ?? "";
      const lonText = lonRaw?.trim() ?? "";
      const latitude = latText ? Number(latText) : Number.NaN;
      const longitude = lonText ? Number(lonText) : Number.NaN;
      return {
        id: count > 1 ? `${baseId}-${count}` : baseId,
        name,
        city,
        states,
        latitude,
        longitude,
        region: getRegion(states),
      };
    });
};
