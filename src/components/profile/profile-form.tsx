"use client";

import { Avatar } from "@/components/ui/avatar";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { RoleChipPicker } from "@/components/profile/role-chip-picker";
import { saveProfile } from "@/app/profile/actions";

type ProfileFormProps = {
  name: string;
  phone: string | null;
  membership: {
    roleTags: string[];
    organization: { name: string; showCrewContactsToCrew: boolean };
  } | null;
};

export function ProfileForm({ name, phone, membership }: ProfileFormProps) {
  const visibilityNote = membership?.organization.showCrewContactsToCrew
    ? "Visible to the whole crew on this film."
    : "Only visible to organisers on this film.";

  return (
    <form action={saveProfile}>
      <div className="mb-6 flex items-center gap-3.5 border-b border-hairline pb-5">
        <Avatar name={name || "?"} size="lg" />
        <div>
          <p className="text-base font-bold">{name || "Your profile"}</p>
          {membership && (
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              {membership.roleTags[0] ?? "Crew"} · {membership.organization.name}
            </p>
          )}
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-6">
        <TextField name="name" label="Name" defaultValue={name} required />
        <div>
          <TextField
            name="phone"
            label="Phone"
            type="tel"
            placeholder="Add a phone number"
            defaultValue={phone ?? ""}
          />
          {membership && <p className="-mt-3 mb-4 text-[11px] italic text-ink-faint">{visibilityNote}</p>}
        </div>
      </div>

      {membership ? (
        <>
          <p className="mb-2 mt-5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
            Roles on {membership.organization.name}
          </p>
          <RoleChipPicker name="roleTags" defaultValue={membership.roleTags} />
          <p className="mt-2 text-[11px] italic text-ink-faint">
            Tap to select as many as apply. Most crew hold more than one role.
          </p>
        </>
      ) : (
        <p className="mt-5 text-[12.5px] text-ink-soft">Join a film to set your roles for it.</p>
      )}

      <SubmitButton pendingLabel="Saving…" className="mt-7 w-full md:w-auto">
        Save changes
      </SubmitButton>
    </form>
  );
}
