"use client";

import { OrganiserList } from "@/components/settings/organiser-list";
import { PrivacyToggleField } from "@/components/settings/privacy-toggle-field";
import { WrapStatusBox } from "@/components/settings/wrap-status-box";
import { WrappedBanner } from "@/components/settings/wrapped-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { saveFilmSettings } from "@/app/settings/actions";

type Organiser = { id: string; user: { id: string; name: string } };

type FilmSettingsFormProps = {
  film: {
    name: string;
    company: string | null;
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
    status: string;
    showTentativeToCrew: boolean;
    showCrewContactsToCrew: boolean;
    showAvailabilityToCrew: boolean;
  };
  organisers: Organiser[];
  currentUserId: string;
};

function toDateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

/**
 * Wrapped state (design system note): a taupe banner up top with a
 * "Reactivate" escape hatch, and every setting below becomes visibly
 * disabled (45% opacity, no interaction) rather than hidden.
 */
export function FilmSettingsForm({ film, organisers, currentUserId }: FilmSettingsFormProps) {
  const isWrapped = film.status === "wrapped";

  return (
    <div>
      {isWrapped && <WrappedBanner />}

      <form action={saveFilmSettings}>
        <div className={isWrapped ? "pointer-events-none opacity-45" : undefined}>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Details</p>
          <TextField name="title" label="Title" defaultValue={film.name} disabled={isWrapped} required />
          <TextField
            name="company"
            label="Company / society"
            defaultValue={film.company ?? ""}
            disabled={isWrapped}
          />
          <div className="grid grid-cols-2 gap-3.5">
            <TextField
              name="dateStart"
              label="Working dates"
              type="date"
              defaultValue={toDateInputValue(film.dateRangeStart)}
              disabled={isWrapped}
            />
            <TextField
              name="dateEnd"
              label=" "
              type="date"
              defaultValue={toDateInputValue(film.dateRangeEnd)}
              disabled={isWrapped}
            />
          </div>

          <p className="mb-1 mt-6 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Privacy</p>
          <PrivacyToggleField
            name="showTentativeToCrew"
            label="Show tentative shoots to crew"
            description="Crew see held dates before you confirm and send invites."
            defaultChecked={film.showTentativeToCrew}
            disabled={isWrapped}
          />
          <PrivacyToggleField
            name="showCrewContactsToCrew"
            label="Share crew contact list"
            description="Crew can see each other's phone numbers, not just yours."
            defaultChecked={film.showCrewContactsToCrew}
            disabled={isWrapped}
          />
          <PrivacyToggleField
            name="showAvailabilityToCrew"
            label="Share availability with crew"
            description="Crew can see each other's availability, not just their own."
            defaultChecked={film.showAvailabilityToCrew}
            disabled={isWrapped}
          />
        </div>

        {!isWrapped && (
          <SubmitButton pendingLabel="Saving…" className="mt-6 w-full md:w-auto">
            Save changes
          </SubmitButton>
        )}
      </form>

      <div className={isWrapped ? "pointer-events-none mt-6 opacity-45" : "mt-6"}>
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Organisers</p>
        <OrganiserList organisers={organisers} currentUserId={currentUserId} />
      </div>

      {!isWrapped && (
        <div className="mt-6">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Status</p>
          <WrapStatusBox />
        </div>
      )}
    </div>
  );
}
