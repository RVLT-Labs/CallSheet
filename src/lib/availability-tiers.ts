import type { OptTone } from "@/components/ui/opt-group";

export type Tier = "best" | "ok" | "unavailable";

export const TIER_OPTIONS: { value: Tier; label: string; tone: OptTone }[] = [
  { value: "best", label: "Best", tone: "forest" },
  { value: "ok", label: "OK", tone: "terracotta" },
  { value: "unavailable", label: "Unavailable", tone: "burgundy" },
];

export const TIER_BG: Record<Tier, string> = {
  best: "bg-forest",
  ok: "bg-terracotta",
  unavailable: "bg-burgundy",
};

export const TIER_LABEL: Record<Tier, string> = {
  best: "Best",
  ok: "OK",
  unavailable: "Unavailable",
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
