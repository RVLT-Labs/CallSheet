// Common film/cinema crew role tags (spec §2: "Camera, Sound, Gaffer, Best Boy, Costume, etc.").
// Free-form beyond this list via the "+ Add" affordance — Membership.roleTags is a
// plain string array, this is just a starting-point preset, not an enum.
export const ROLE_PRESETS = [
  "Director",
  "Producer",
  "DOP",
  "Camera",
  "Gaffer",
  "Lighting",
  "Grip",
  "Audio",
  "Set",
  "Art Dept",
  "Costume",
  "Makeup",
  "Actor",
] as const;
