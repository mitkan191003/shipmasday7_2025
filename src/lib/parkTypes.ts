export type RegionKey = "lower48" | "alaska" | "hawaii" | "territories";

export type Park = {
  id: string;
  name: string;
  city: string;
  states: string[];
  latitude: number;
  longitude: number;
  region: RegionKey;
};

export type ParkImageMap = Record<string, string>;

export type ParkVisit = {
  id: string;
  park_id: string;
  first_visited_at: string | null;
  created_at: string;
};

export type JournalEntry = {
  id: string;
  park_id: string;
  visit_date: string;
  notes: string | null;
  image_url: string | null;
  image_path: string | null;
  created_at: string;
};
