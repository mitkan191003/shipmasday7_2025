# Trailkeeper setup notes

## Park hover images
- Edit `src/data/parkImages.ts`.
- Keys are slugified park names (lowercase, hyphenated). Example:

```ts
export const parkImages = {
  "yosemite-national-park": "https://your-cdn.com/yosemite.jpg",
  "acadia-national-park": "https://your-cdn.com/acadia.jpg",
};
```

## Replace placeholder UI assets
- Park marker icon: `public/icons/park-marker.svg`
- Visited checkmark: `public/icons/checkmark.svg`
- Empty state icon: `public/icons/mountain.svg`

Drop in your own SVGs with the same filenames to replace them in place.

## Map data source
- The US states map lives in `public/map/us-states-10m.json`.
- If you want a different map, replace that file with another TopoJSON file that includes state names.

## Park data source
- The parks are loaded from `parks.csv` at build/runtime (`src/lib/loadParks.ts`).
- If you add more parks, keep the same column order:
  `Park,Nearest City,State(s),Latitude,Longitude`
