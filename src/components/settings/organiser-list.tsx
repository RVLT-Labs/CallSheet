"use client";

import { useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { ErrorToast } from "@/components/ui/error-toast";
import { addOrganiser } from "@/app/settings/actions";

type Organiser = { id: string; user: { id: string; name: string } };

export function OrganiserList({ organisers, currentUserId }: { organisers: Organiser[]; currentUserId: string }) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Committed up front and rolled back on failure, not via useOptimistic — dispatching
  // an optimistic add and later committing the same entry to real state inside one
  // transition briefly double-applies it (duplicate list entry/React key).
  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setEmail("");
    setAdding(false);
    setInvitedEmails((prev) => [...prev, trimmed]);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("email", trimmed);
        await addOrganiser(formData);
      } catch {
        setInvitedEmails((prev) => prev.filter((e) => e !== trimmed));
        setError(`Couldn't invite ${trimmed}. Try again.`);
      }
    });
  }

  return (
    <div>
      {organisers.map((o) => (
        <div key={o.id} className="flex items-center gap-2.5 border-b border-hairline py-2.5">
          <Avatar name={o.user.name} />
          <span className="flex-1 text-[13px] font-medium">{o.user.name}</span>
          <span className="text-[11px] text-ink-soft">{o.user.id === currentUserId ? "You" : "Organiser"}</span>
        </div>
      ))}

      {invitedEmails.map((invitedEmail) => (
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
          <button type="button" onClick={handleAdd} disabled={isPending} className="text-[12px] font-semibold text-burgundy">
            Invite
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="py-2.5 text-xs font-semibold text-burgundy"
        >
          + Add an organiser
        </button>
      )}

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
