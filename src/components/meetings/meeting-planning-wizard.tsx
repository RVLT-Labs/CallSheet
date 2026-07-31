"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { OptGroup } from "@/components/ui/opt-group";
import { PillRow } from "@/components/ui/pill-row";
import { StatusDot } from "@/components/ui/status-dot";
import { TextField } from "@/components/ui/text-field";
import { TIER_LABEL, type Tier } from "@/lib/availability-tiers";
import { confirmMeeting, suggestDates } from "@/app/meetings/new/actions";
import type { HalfDayPreference, RankedCandidate } from "@/server/scheduling-suggestions";

type Step = 1 | 2 | 3 | 4;
type CrewState = "off" | "general" | "required";
type Placeholder = { label: string; kind: "required" | "general" };

function StepDots({ step }: { step: Step }) {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <span className="w-4 text-ink-soft">{step > 1 ? "‹" : ""}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= step ? "bg-burgundy" : "bg-hairline"}`} />
        ))}
      </div>
      <span className="text-[11px] text-ink-faint">{step} of 4</span>
    </div>
  );
}

const CREW_STATE_OPTIONS = [
  { value: "off" as const, label: "Off", tone: "ink" as const },
  { value: "general" as const, label: "In", tone: "forest" as const },
  { value: "required" as const, label: "Required", tone: "burgundy" as const },
];

const TIER_TONE: Record<Tier, "forest" | "terracotta" | "burgundy"> = {
  best: "forest",
  ok: "terracotta",
  unavailable: "burgundy",
};

export function MeetingPlanningWizard({
  crew,
  windowStart,
  windowEnd,
}: {
  crew: { membershipId: string; name: string }[];
  windowStart: string;
  windowEnd: string;
}) {
  const [step, setStep] = useState<Step>(1);
  const [crewSearch, setCrewSearch] = useState("");

  const [crewState, setCrewState] = useState<Record<string, CrewState>>(() =>
    Object.fromEntries(crew.map((c) => [c.membershipId, "off" as CrewState])),
  );
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [newPlaceholderKind, setNewPlaceholderKind] = useState<"required" | "general">("required");
  const [newPlaceholderLabel, setNewPlaceholderLabel] = useState("");

  const [dayMode, setDayMode] = useState<"single" | "multi">("single");
  const [numDays, setNumDays] = useState(2);
  const [halfDayPreference, setHalfDayPreference] = useState<HalfDayPreference>("EITHER");
  const [searchStart, setSearchStart] = useState(windowStart);
  const [searchEnd, setSearchEnd] = useState(windowEnd);
  const [defaultStartTime, setDefaultStartTime] = useState("08:00");

  const [candidates, setCandidates] = useState<RankedCandidate[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const requiredMembershipIds = crew.filter((c) => crewState[c.membershipId] === "required").map((c) => c.membershipId);
  const generalMembershipIds = crew.filter((c) => crewState[c.membershipId] === "general").map((c) => c.membershipId);
  const requiredPlaceholders = placeholders.filter((p) => p.kind === "required").map((p) => p.label);
  const generalPlaceholders = placeholders.filter((p) => p.kind === "general").map((p) => p.label);

  const totalSelected =
    requiredMembershipIds.length + generalMembershipIds.length + placeholders.length;

  function addPlaceholder() {
    const label = newPlaceholderLabel.trim();
    if (!label) return;
    setPlaceholders((prev) => [...prev, { label, kind: newPlaceholderKind }]);
    setNewPlaceholderLabel("");
  }

  function removePlaceholder(label: string) {
    setPlaceholders((prev) => prev.filter((p) => p.label !== label));
  }

  async function handleLoadSuggestions() {
    setLoadingSuggestions(true);
    setSuggestError(null);
    try {
      const results = await suggestDates({
        required: { membershipIds: requiredMembershipIds, placeholderLabels: requiredPlaceholders },
        general: { membershipIds: generalMembershipIds, placeholderLabels: generalPlaceholders },
        numDays: dayMode === "single" ? 1 : numDays,
        halfDayPreference,
        searchStart,
        searchEnd,
      });
      setCandidates(results);
      setSelectedIndex(null);
      setStep(3);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Could not load suggested dates.");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleConfirm(status: "tentative" | "confirmed") {
    if (selectedIndex === null || !candidates) return;
    const candidate = candidates[selectedIndex];
    setConfirming(true);
    setConfirmError(null);
    try {
      await confirmMeeting({
        status,
        dayIsos: candidate.dayIsos,
        halfDayPreference,
        defaultStartTime,
        required: { membershipIds: requiredMembershipIds, placeholderLabels: requiredPlaceholders },
        general: { membershipIds: generalMembershipIds, placeholderLabels: generalPlaceholders },
      });
    } catch (e) {
      // redirect() throws internally on success — only a real error lands here.
      setConfirmError(e instanceof Error ? e.message : "Could not create the meeting.");
      setConfirming(false);
    }
  }

  if (step === 1) {
    return (
      <div>
        <StepDots step={1} />
        <h2 className="font-display mb-1 text-xl font-bold italic text-burgundy">Who&apos;s needed</h2>
        <p className="mb-5 text-[12.5px] text-ink-soft">
          Required people gate which dates can even be suggested. Everyone else is shown as a ratio only.
        </p>

        {crew.length > 6 && (
          <TextField
            label="Search crew"
            placeholder="Name…"
            value={crewSearch}
            onChange={(e) => setCrewSearch(e.target.value)}
          />
        )}

        {crew
          .filter((c) => c.name.toLowerCase().includes(crewSearch.trim().toLowerCase()))
          .map((c) => (
            <ListRow key={c.membershipId}>
              <span className="text-[13px] font-medium">{c.name}</span>
              <OptGroup
                aria-label={`${c.name} status`}
                options={CREW_STATE_OPTIONS}
                value={crewState[c.membershipId] ?? "off"}
                onChange={(value) => setCrewState((prev) => ({ ...prev, [c.membershipId]: value }))}
              />
            </ListRow>
          ))}

        <p className="mb-2 mt-6 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          Placeholder slots
        </p>
        {placeholders.map((p) => (
          <div key={p.label} className="flex items-center justify-between border-b border-hairline py-2">
            <span className="text-[13px]">
              {p.label} <span className="text-ink-soft">({p.kind === "required" ? "Required" : "General"})</span>
            </span>
            <button type="button" onClick={() => removePlaceholder(p.label)} aria-label={`Remove ${p.label}`} className="text-ink-faint">
              ✕
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2.5 py-3">
          <PillRow
            aria-label="Placeholder kind"
            value={newPlaceholderKind}
            onChange={setNewPlaceholderKind}
            options={[
              { value: "required", label: "Required" },
              { value: "general", label: "General" },
            ]}
          />
          <input
            value={newPlaceholderLabel}
            onChange={(e) => setNewPlaceholderLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPlaceholder();
              }
            }}
            placeholder="e.g. TBD Producer"
            className="flex-1 border-0 border-b-[1.5px] border-hairline bg-transparent py-2 text-[13px] placeholder:text-ink-faint focus:border-burgundy focus:outline-none"
          />
          <button
            type="button"
            onClick={addPlaceholder}
            aria-label="Add placeholder"
            className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-burgundy text-base text-white"
          >
            +
          </button>
        </div>

        <Button variant="primary" disabled={totalSelected === 0} onClick={() => setStep(2)} className="mt-4 w-full">
          Continue
        </Button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div>
        <StepDots step={2} />
        <h2 className="font-display mb-1 text-xl font-bold italic text-burgundy">When</h2>
        <p className="mb-5 text-[12.5px] text-ink-soft">We&apos;ll search this window and rank the best dates.</p>

        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Length</p>
        <div className="mb-5 flex items-center gap-3">
          <PillRow
            aria-label="Meeting length"
            value={dayMode}
            onChange={setDayMode}
            options={[
              { value: "single", label: "Single day" },
              { value: "multi", label: "Multi-day" },
            ]}
          />
          {dayMode === "multi" && (
            <input
              type="number"
              min={2}
              value={numDays}
              onChange={(e) => setNumDays(Math.max(2, Number(e.target.value)))}
              className="w-16 rounded-md border border-hairline bg-white px-2 py-1.5 text-[13px]"
              aria-label="Number of days"
            />
          )}
        </div>

        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Half-day</p>
        <div className="mb-5">
          <PillRow
            aria-label="Half-day preference"
            value={halfDayPreference}
            onChange={setHalfDayPreference}
            options={[
              { value: "AM", label: "Morning" },
              { value: "PM", label: "Afternoon" },
              { value: "EITHER", label: "Full day" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <TextField
            label="Search from"
            type="date"
            min={windowStart}
            max={windowEnd}
            value={searchStart}
            onChange={(e) => setSearchStart(e.target.value)}
          />
          <TextField
            label="Search until"
            type="date"
            min={searchStart}
            max={windowEnd}
            value={searchEnd}
            onChange={(e) => setSearchEnd(e.target.value)}
          />
        </div>

        <TextField
          label="Default start time"
          type="time"
          value={defaultStartTime}
          onChange={(e) => setDefaultStartTime(e.target.value)}
        />

        {suggestError && <p className="mb-3 text-[12.5px] text-burgundy">{suggestError}</p>}

        <div className="mt-4 flex gap-3">
          <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
            Back
          </Button>
          <Button variant="primary" disabled={loadingSuggestions} onClick={handleLoadSuggestions} className="flex-1">
            {loadingSuggestions ? "Finding dates…" : "Find dates"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div>
        <StepDots step={3} />
        <h2 className="font-display mb-1 text-xl font-bold italic text-burgundy">Suggested dates</h2>
        <p className="mb-5 text-[12.5px] text-ink-soft">Ranked by required people&apos;s availability first.</p>

        {candidates && candidates.length === 0 && (
          <p className="mb-5 text-[13px] text-ink-soft">
            No date in this window works for everyone marked Required. Try widening the search window or
            reconsidering who&apos;s Required.
          </p>
        )}

        {candidates?.map((candidate, i) => {
          const label =
            candidate.dayIsos.length === 1
              ? candidate.dayIsos[0]
              : `${candidate.dayIsos[0]} – ${candidate.dayIsos[candidate.dayIsos.length - 1]}`;
          const expanded = expandedIndex === i;
          return (
            <div key={candidate.startDateIso} className="border-b border-hairline py-3">
              <button
                type="button"
                onClick={() => setExpandedIndex(expanded ? null : i)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-[13px] font-semibold">{label}</span>
                <span className="font-mono text-[12px] text-ink-soft">
                  {candidate.availableCount}/{candidate.totalCount}
                </span>
              </button>

              {expanded && (
                <div className="mt-3 space-y-1.5">
                  {candidate.breakdown.map((b, j) => (
                    <div key={j} className="flex items-center justify-between text-[12px]">
                      <span>
                        {b.slot.kind === "member" ? b.slot.name : b.slot.label}{" "}
                        <span className="text-ink-faint">({b.role === "required" ? "Required" : "General"})</span>
                      </span>
                      {b.tier ? (
                        <StatusDot tone={TIER_TONE[b.tier]} label={TIER_LABEL[b.tier]} />
                      ) : (
                        <span className="text-ink-faint">
                          {b.slot.kind === "placeholder" ? "Placeholder" : "Unknown"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`mt-2 text-[12px] font-semibold ${selectedIndex === i ? "text-forest" : "text-burgundy"}`}
              >
                {selectedIndex === i ? "Selected ✓" : "Select this date"}
              </button>
            </div>
          );
        })}

        <div className="mt-5 flex gap-3">
          <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
            Back
          </Button>
          <Button variant="primary" disabled={selectedIndex === null} onClick={() => setStep(4)} className="flex-1">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  const selected = selectedIndex !== null ? candidates?.[selectedIndex] : null;

  return (
    <div>
      <StepDots step={4} />
      <h2 className="font-display mb-1 text-xl font-bold italic text-burgundy">Confirm</h2>
      <p className="mb-5 text-[12.5px] text-ink-soft">
        Tentative holds the date with no roster yet. Confirmed sends invites to everyone required or in.
      </p>

      {selected && (
        <div className="mb-5 rounded-md border border-hairline bg-white p-4">
          <p className="mb-1 text-[13px] font-semibold">
            {selected.dayIsos.length === 1
              ? selected.dayIsos[0]
              : `${selected.dayIsos[0]} – ${selected.dayIsos[selected.dayIsos.length - 1]}`}
          </p>
          <p className="text-[12px] text-ink-soft">
            {halfDayPreference === "EITHER" ? "Full day" : halfDayPreference === "AM" ? "Morning" : "Afternoon"} ·
            Start {defaultStartTime}
          </p>
          <p className="mt-2 text-[12px] text-ink-soft">
            {requiredMembershipIds.length + requiredPlaceholders.length} required ·{" "}
            {generalMembershipIds.length + generalPlaceholders.length} general
          </p>
        </div>
      )}

      {confirmError && <p className="mb-3 text-[12.5px] text-burgundy">{confirmError}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(3)} disabled={confirming} className="flex-1">
          Back
        </Button>
      </div>
      <div className="mt-3 flex gap-3">
        <Button variant="secondary" disabled={confirming} onClick={() => handleConfirm("tentative")} className="flex-1">
          {confirming ? "Saving…" : "Save as Tentative"}
        </Button>
        <Button variant="primary" disabled={confirming} onClick={() => handleConfirm("confirmed")} className="flex-1">
          {confirming ? "Saving…" : "Confirm meeting"}
        </Button>
      </div>
    </div>
  );
}
