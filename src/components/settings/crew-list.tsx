"use client";

import { useOptimistic, useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { ErrorToast } from "@/components/ui/error-toast";
import { ROLE_PRESETS } from "@/lib/roles";
import { addCrewMember, removeCrewMember } from "@/app/settings/actions";

type CrewMember = { id: string; roleTags: string[]; user: { id: string; name: string } };

type OptimisticState = { removedIds: string[]; invitedEmails: string[] };

export function CrewList({ crew }: { crew: CrewMember[] }) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [optimistic, applyOptimistic] = useOptimistic<OptimisticState, { type: "remove"; id: string } | { type: "invite"; email: string }>(
    { removedIds, invitedEmails },
    (state, action) =>
      action.type === "remove"
        ? { ...state, removedIds: [...state.removedIds, action.id] }
        : { ...state, invitedEmails: [...state.invitedEmails, action.email] },
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visibleCrew = crew.filter((c) => !optimistic.removedIds.includes(c.id));

  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed) return;
    const roleTag = role;
    setEmail("");
    setRole("");
    setAdding(false);
    startTransition(async () => {
      applyOptimistic({ type: "invite", email: trimmed });
      try {
        const formData = new FormData();
        formData.set("email", trimmed);
        if (roleTag) formData.set("role", roleTag);
        await addCrewMember(formData);
        setInvitedEmails((prev) => [...prev, trimmed]);
      } catch {
        setError(`Couldn't invite ${trimmed}. Try again.`);
      }
    });
  }

  function handleRemove(member: CrewMember) {
    if (!confirm(`Remove ${member.user.name} from the crew?`)) return;
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: member.id });
      try {
        const formData = new FormData();
        formData.set("memberId", member.id);
        await removeCrewMember(formData);
        setRemovedIds((prev) => [...prev, member.id]);
      } catch {
        setError(`Couldn't remove ${member.user.name}. Try again.`);
      }
    });
  }

  return (
    <div>
      {visibleCrew.length === 0 && optimistic.invitedEmails.length === 0 && (
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

      {optimistic.invitedEmails.map((invitedEmail) => (
        <div key={invitedEmail} className="flex items-center gap-2.5 border-b border-hairline py-2.5">
          <Avatar name={invitedEmail} />
          <span className="flex-1 text-[13px] font-medium text-ink-soft">{invitedEmail}</span>
          <span className="text-[11px] text-ink-soft">Invited</span>
        </div>
      ))}

      {adding ? (
        <div className="flex items-center gap-2.5 py-2.5">
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Email address"
            className="flex-1 border-0 border-b-[1.5px] border-hairline bg-transparent py-1.5 text-[13px] placeholder:text-ink-faint focus:border-burgundy focus:outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded border-0 bg-transparent text-[11px] font-semibold text-burgundy focus:outline-none"
          >
            <option value="">+ role</option>
            {ROLE_PRESETS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleAdd} disabled={isPending} className="text-[12px] font-semibold text-burgundy">
            Invite
          </button>
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
