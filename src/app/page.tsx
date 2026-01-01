import AppShell from "@/components/AppShell";
import { loadParks } from "@/lib/loadParks";

export default function HomePage() {
  const parks = loadParks();

  return <AppShell parks={parks} />;
}
