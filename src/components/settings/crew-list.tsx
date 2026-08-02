"use client";

import { useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { ErrorToast } from "@/components/ui/error-toast";
import { RoleChip } from "@/components/ui/role-chip";
import { ROLE_PRESETS } from "@/lib/roles";
import { addCrewMember, removeCrewMember } from "@/app/settings/actions";

type CrewMember = { id: string; roleTags: string[]; user: { id: string; name: string } };

type InvitedCrew = { email: string; roleTags: string[] };

export function CrewList({ crew }: { crew: CrewMember[] }) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [invited, setInvited] = useState<InvitedCrew[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visibleCrew = crew.filter((c) => !removedIds.includes(c.id));

  function toggleRole(role: string) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  // State is committed up front (not via useOptimistic) and rolled back on failure —
  // dispatching an optimistic add and later committing the same entry to real state
  // inside one transition briefly double-applies it (duplicate list entry/React key).
  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed) return;
    const invitee = { email: trimmed, roleTags: roles };
    setEmail("");
    setRoles([]);
    setAdding(false);
    setInvited((prev) => [...prev, invitee]);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("email", trimmed);
        invitee.roleTags.forEach((r) => formData.append("role", r));
        await addCrewMember(formData);
      } catch {
        setInvited((prev) => prev.filter((i) => i !== invitee));
        setError(`Couldn't invite ${trimmed}. Try again.`);
      }
    });
  }

  function handleRemove(member: CrewMember) {
    if (!confirm(`Remove ${member.user.name} from the crew?`)) return;
    setRemovedIds((prev) => [...prev, member.id]);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("memberId", member.id);
        await removeCrewMember(formData);
      } catch {
        setRemovedIds((prev) => prev.filter((id) => id !== member.id));
        setError(`Couldn't remove ${member.user.name}. Try again.`);
      }
    });
  }

  return (
    <div>
      {visibleCrew.length === 0 && invited.length === 0 && (
        <p className="py-2.5 text-[12.5px] text-ink-soft">No crew yet. Invite people to join the film.</p>
      )}

      {visibleCrew.map((member) => (
        <div key={member.id} className="flex items-center gap-2.5 border-b border-hairline py-2.5">
          <Avatar name={member.user.name} />
          <div className="flex-1">
            <p className="text-[13px] font-medium">{member.user.name}</p>
            {member.roleTags.length > 0 && (
              <p className="text-[11px] text-ink-soft">{member.roleTags.join(", ")}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleRemove(member)}
            disabled={isPending}
            aria-label={`Remove ${member.user.name}`}
            className="text-[11px] font-semibold text-burgundy"
          >
            Remove
          </button>
        </div>
      ))}

      {invited.map((invitee) => (
        <div key={invitee.email} className="flex items-center gap-2.5 border-b border-hairline py-2.5">
          <Avatar name={invitee.email} />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-ink-soft">{invitee.email}</p>
            {invitee.roleTags.length > 0 && (
              <p className="text-[11px] text-ink-soft">{invitee.roleTags.join(", ")}</p>
            )}
          </div>
          <span className="text-[11px] text-ink-soft">Invited</span>
        </div>
      ))}

      {adding ? (
        <div className="flex flex-col gap-2 py-2.5">
          <div className="flex items-center gap-2.5">
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Email address"
              className="flex-1 border-0 border-b-[1.5px] border-hairline bg-transparent py-1.5 text-[13px] placeholder:text-ink-faint focus:border-burgundy focus:outline-none"
            />
            <button type="button" onClick={handleAdd} disabled={isPending} className="text-[12px] font-semibold text-burgundy">
              Invite
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_PRESETS.map((r) => (
              <RoleChip key={r} label={r} selected={roles.includes(r)} onToggle={() => toggleRole(r)} />
            ))}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="py-2.5 text-xs font-semibold text-burgundy">
          + Add a crew member
        </button>
      )}

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
