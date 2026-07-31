"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/**
 * Passkey registration requires an authenticated session (WebAuthn ceremony
 * runs client-side against the signed-in user), so it lives here rather than
 * on the sign-in screen — see PasskeySignIn for the sign-in-time counterpart.
 */
export function PasskeyManager() {
  const { data: passkeys, isPending, refetch } = authClient.useListPasskeys();
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setAdding(true);
    setError(null);
    const { error } = await authClient.passkey.addPasskey();
    setAdding(false);
    if (error) {
      setError("Couldn't add that passkey. Try again.");
      return;
    }
    refetch?.();
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setError(null);
    const { error } = await authClient.passkey.deletePasskey({ id });
    setRemovingId(null);
    if (error) {
      setError("Couldn't remove that passkey. Try again.");
      return;
    }
    refetch?.();
  }

  return (
    <div className="mt-7 border-t border-hairline pt-5">
      <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Passkeys</p>
      <p className="mb-4 text-[12.5px] text-ink-soft">
        Sign in faster on this device with your fingerprint, face, or screen lock — no code needed.
      </p>

      {!isPending && passkeys && passkeys.length > 0 && (
        <ul className="mb-4">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between border-b border-hairline py-2.5 text-[13px] last:border-b-0"
            >
              <span className="text-ink">{passkey.name || "Passkey"}</span>
              <button
                type="button"
                disabled={removingId === passkey.id}
                onClick={() => handleRemove(passkey.id)}
                className="font-semibold text-burgundy"
              >
                {removingId === passkey.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-3 text-[12.5px] text-burgundy">{error}</p>}

      <Button type="button" variant="secondary" disabled={adding} onClick={handleAdd}>
        {adding ? "Waiting for passkey…" : "Add a passkey"}
      </Button>
    </div>
  );
}
