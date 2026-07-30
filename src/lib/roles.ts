// Common crew role tags (spec §2: "Camera, Sound, Gaffer, Best Boy, Costume, etc.").
// Free-form beyond this list via the "+ Add" affordance — Membership.roleTags is a
// plain string array, this is just a starting-point preset, not an enum.
export const ROLE_PRESETS = [
  "Camera",
  "Sound",
  "Lighting",
  "Gaffer",
  "Best Boy",
  "Costume",
  "Stage Mgmt",
] as const;
