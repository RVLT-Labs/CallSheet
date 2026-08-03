import type { OptTone } from "@/components/ui/opt-group";

export type BlockType = "soft" | "hard";

export const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string; tone: OptTone }[] = [
  { value: "soft", label: "Soft blocker", tone: "terracotta" },
  { value: "hard", label: "Hard blocker", tone: "burgundy" },
];

export const BLOCK_TYPE_BG: Record<BlockType, string> = {
  soft: "bg-terracotta",
  hard: "bg-burgundy",
};

export const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  soft: "Soft blocker",
  hard: "Hard blocker",
};

// Soft blockers read as "flexible — I can move this if needed"; hard as "I can't move this".
export const BLOCK_TYPE_HINT: Record<BlockType, string> = {
  soft: "Flexible — could move this if needed",
  hard: "Can't move this",
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
