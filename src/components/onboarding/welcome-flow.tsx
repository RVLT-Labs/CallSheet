"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { FilmCreationWizard } from "@/components/films/film-creation-wizard";
import { saveOnboardingName } from "@/app/welcome/actions";

type Step = "name" | "film";

/**
 * Self-signup onboarding (no invite): name, then a new film, then the
 * dashboard tour picks up from there (film-creation-wizard.tsx redirects
 * with ?tour=1 on finish). Someone who already has a name resumes at the
 * film step rather than re-asking it.
 *
 * Invited crew (skipFilmStep) already have a film via the invitation they
 * accepted — they only ever need the name step, then straight to "/".
 */
export function WelcomeFlow({ initialName, skipFilmStep }: { initialName: string; skipFilmStep?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialName.trim() ? "film" : "name");
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveOnboardingName(name);
      if (skipFilmStep) {
        router.push("/");
      } else {
        setStep("film");
      }
    } catch {
      setError("Something went wrong saving that. Try again.");
      setSaving(false);
    }
  }

  if (step === "film") {
    return <FilmCreationWizard finalRedirect="/?tour=1" />;
  }

  return (
    <form onSubmit={handleContinue} className="flex flex-1 flex-col">
      <div className="mb-7">
        <p className="font-display mb-1.5 text-center text-3xl font-bold italic text-burgundy">
          Welcome to Callsheet
        </p>
        <p className="text-center text-[12.5px] leading-relaxed text-ink-soft">
          First, what should your crew call you?
        </p>
      </div>

      <TextField
        label="Name"
        required
        placeholder="e.g. Sam Rivera"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      {error && <p className="mb-3 text-[12.5px] text-burgundy">{error}</p>}

      <Button type="submit" variant="primary" disabled={saving || !name.trim()} className="mt-1.5 w-full">
        {saving ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
