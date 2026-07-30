"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { addOrganiser } from "@/app/settings/actions";

type Organiser = { id: string; user: { id: string; name: string } };

export function OrganiserList({ organisers, currentUserId }: { organisers: Organiser[]; currentUserId: string }) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    if (!email.trim()) return;
    setPending(true);
    const formData = new FormData();
    formData.set("email", email.trim());
    await addOrganiser(formData);
    setPending(false);
    setEmail("");
    setAdding(false);
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
          <button type="button" onClick={handleAdd} disabled={pending} className="text-[12px] font-semibold text-burgundy">
            {pending ? "Inviting…" : "Invite"}
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
    </div>
  );
}
