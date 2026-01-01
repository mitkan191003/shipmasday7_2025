import type { Park } from "@/lib/parkTypes";

export const buildStateIndex = (parks: Park[]) => {
  const index = new Map<string, Park[]>();
  parks.forEach((park) => {
    park.states.forEach((state) => {
      const key = state.trim();
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)?.push(park);
    });
  });
  return index;
};
