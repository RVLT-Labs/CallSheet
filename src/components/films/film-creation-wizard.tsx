"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PillRow } from "@/components/ui/pill-row";
import { TextField } from "@/components/ui/text-field";
import { ROLE_PRESETS } from "@/lib/roles";
import { createFilm, type CreateFilmInvite } from "@/app/films/new/actions";

type Step = 1 | 2 | 3;

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-between">
      <span className="w-4 text-ink-soft">{step > 1 ? "‹" : ""}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= step ? "bg-burgundy" : "bg-hairline"}`} />
        ))}
      </div>
      <span className="text-[11px] text-ink-faint">{step} of 3</span>
    </div>
  );
}

/**
 * 3 short steps, not one long form (design system layout pattern for
 * multi-step flows): details → invite crew → success. The invite step is
 * genuinely skippable, no dark pattern forcing it.
 */
export function FilmCreationWizard({ finalRedirect = "/" }: { finalRedirect?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [posterUrl, setPosterUrl] = useState("");

  const [inviteMode, setInviteMode] = useState<"single" | "paste">("single");
  const [invites, setInvites] = useState<CreateFilmInvite[]>([]);
  const [singleEmail, setSingleEmail] = useState("");
  const [pasteText, setPasteText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ filmName: string; invitedCount: number; failedInvites: string[] } | null>(
    null,
  );

  function addSingleInvite() {
    const email = singleEmail.trim();
    if (!email || invites.some((i) => i.email === email)) return;
    setInvites((prev) => [...prev, { email }]);
    setSingleEmail("");
  }

  function setInviteRole(email: string, role: string) {
    setInvites((prev) => prev.map((i) => (i.email === email ? { ...i, role: role || undefined } : i)));
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((i) => i.email !== email));
  }

  function mergePastedEmails() {
    const found = pasteText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => /\S+@\S+\.\S+/.test(s));
    setInvites((prev) => {
      const existing = new Set(prev.map((i) => i.email));
      const additions = found.filter((email) => !existing.has(email)).map((email) => ({ email }));
      return [...prev, ...additions];
    });
  }

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await createFilm({ title, company, dateStart, dateEnd, posterUrl, invites });
      setResult({ filmName: res.filmName, invitedCount: res.invitedCount, failedInvites: res.failedInvites });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong creating the film.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 1) {
    return (
      <div className="flex flex-1 flex-col">
        <StepDots step={1} />
        <h1 className="font-display mb-1 mt-3.5 text-2xl font-bold italic text-burgundy">New film</h1>
        <p className="mb-6 text-[12.5px] text-ink-soft">Set up the basics. You can change any of this later.</p>

        <div className="md:grid md:grid-cols-2 md:gap-6">
          <TextField label="Title" placeholder="e.g. Verdant Hour" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField
            label="Production company"
            placeholder="e.g. Late Bloom Pictures"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3.5">
          <TextField
            label="Working dates"
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
          <TextField label=" " type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
        </div>
        <TextField
          label="Poster URL (optional)"
          placeholder="https://…"
          value={posterUrl}
          onChange={(e) => setPosterUrl(e.target.value)}
        />

        <Button
          variant="primary"
          disabled={!title.trim() || !dateStart || !dateEnd}
          onClick={() => setStep(2)}
          className="mt-auto w-full md:mt-6"
        >
          Continue
        </Button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex flex-1 flex-col">
        <StepDots step={2} />
        <h1 className="font-display mb-1 mt-3.5 text-2xl font-bold italic text-burgundy">Invite your crew</h1>
        <p className="mb-6 text-[12.5px] text-ink-soft">
          They&apos;ll get an email to join and set their availability. You can add more anytime.
        </p>

        <div className="mb-4">
          <PillRow
            aria-label="Invite mode"
            value={inviteMode}
            onChange={setInviteMode}
            options={[
              { value: "single", label: "Add one by one" },
              { value: "paste", label: "Paste a list" },
            ]}
          />
        </div>

        {invites.map((invite) => (
          <div key={invite.email} className="flex items-center justify-between border-b border-hairline py-2.5">
            <span className="text-[13px] font-medium">{invite.email}</span>
            <div className="flex items-center gap-2.5">
              <select
                value={invite.role ?? ""}
                onChange={(e) => setInviteRole(invite.email, e.target.value)}
                className="rounded border-0 bg-transparent text-[11px] font-semibold text-burgundy focus:outline-none"
              >
                <option value="">+ role</option>
                {ROLE_PRESETS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeInvite(invite.email)}
                aria-label={`Remove ${invite.email}`}
                className="text-ink-faint"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {inviteMode === "single" ? (
          <div className="flex items-center gap-2.5 py-3">
            <input
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSingleInvite();
                }
              }}
              placeholder="Add crew by email"
              className="flex-1 border-0 border-b-[1.5px] border-hairline bg-transparent py-2 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-burgundy focus:outline-none"
            />
            <button
              type="button"
              onClick={addSingleInvite}
              aria-label="Add"
              className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-burgundy text-base text-white"
            >
              +
            </button>
          </div>
        ) : (
          <div className="py-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onBlur={mergePastedEmails}
              placeholder="One email per line, or separate with commas"
              rows={4}
              className="w-full rounded-md border-[1.5px] border-hairline p-3.5 text-[13px] text-ink-soft placeholder:text-ink-faint focus:border-burgundy focus:outline-none"
            />
          </div>
        )}

        <p className="mb-4 text-xs text-ink-soft">
          {invites.length > 0
            ? `${invites.length} ${invites.length === 1 ? "person" : "people"} will be invited. You can skip this and invite later.`
            : "You can skip this and invite crew later."}
        </p>

        {error && <p className="mb-3 text-[12.5px] text-burgundy">{error}</p>}

        <Button variant="primary" disabled={submitting} onClick={handleCreate} className="mt-auto w-full">
          {submitting ? "Creating…" : "Continue"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[1.5px] border-forest">
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] stroke-forest" fill="none" strokeWidth={1.8}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="font-display mb-1.5 text-2xl font-bold italic text-burgundy">{result?.filmName} is ready</h1>
      <p className="mb-6 max-w-[230px] text-[13px] leading-relaxed text-ink-soft">
        {result && result.invitedCount > 0
          ? `${result.invitedCount} ${result.invitedCount === 1 ? "invite is" : "invites are"} on their way. Here's what happens next.`
          : "Here's what happens next."}
      </p>

      {result && result.failedInvites.length > 0 && (
        <p className="mb-6 max-w-[230px] text-[12.5px] leading-relaxed text-burgundy">
          {result.failedInvites.length === 1
            ? `Couldn't send an invite to ${result.failedInvites[0]}.`
            : `Couldn't send invites to ${result.failedInvites.length} people.`}{" "}
          You can resend from Settings.
        </p>
      )}

      <div className="mb-6 w-full text-left">
        {[
          "Crew get an email invite and set their own availability",
          "You'll see everyone's availability fill in on your dashboard",
          "When you're ready, plan your first shoot",
        ].map((text, i) => (
          <div key={i} className="flex gap-2.5 border-b border-hairline py-2.5 text-[12.5px] text-ink-soft last:border-b-0">
            <span className="font-bold text-burgundy">{i + 1}</span>
            {text}
          </div>
        ))}
      </div>

      <Button variant="primary" onClick={() => router.push(finalRedirect)} className="w-full">
        Go to {result?.filmName}
      </Button>
    </div>
  );
}
