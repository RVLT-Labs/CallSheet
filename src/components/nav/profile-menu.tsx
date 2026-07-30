"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { FilmPickerList } from "@/components/film-picker/film-picker-list";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import type { Membership } from "@/server/memberships";

type ProfileMenuProps = {
  name: string;
  activeHref: string;
  activeOrganizationId: string | null;
  memberships: { active: Membership[]; wrapped: Membership[] };
  variant: "desktop" | "mobile";
};

/**
 * Avatar trigger + dropdown (design system §5.6/§5.7 pattern) — same split as
 * FilmPicker: mobile opens a Sheet, desktop opens a dropdown anchored under
 * the trigger. Houses the film switcher (so a film can be swapped without
 * losing account access) plus profile/sign-out.
 */
export function ProfileMenu({ name, activeHref, activeOrganizationId, memberships, variant }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const profileActive = activeHref === "/profile";
  const currentMembership = [...memberships.active, ...memberships.wrapped].find(
    (m) => m.organization.id === activeOrganizationId,
  );
  const isOrganiser = currentMembership && currentMembership.role !== "member";

  useEffect(() => {
    if (!open || variant !== "desktop") return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, variant]);

  async function handleSelectFilm(organizationId: string) {
    setOpen(false);
    if (organizationId !== activeOrganizationId) {
      await authClient.organization.setActive({ organizationId });
    }
    router.refresh();
  }

  const menuBody = (
    <div className="flex flex-col gap-4">
      <FilmPickerList
        active={memberships.active}
        wrapped={memberships.wrapped}
        activeOrganizationId={activeOrganizationId}
        onSelect={handleSelectFilm}
      />
      <div className="flex items-center gap-4 border-t border-hairline pt-3">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="text-[13px] font-semibold text-burgundy"
        >
          Your profile
        </Link>
        {isOrganiser && (
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="text-[13px] font-semibold text-burgundy"
          >
            Film settings
          </Link>
        )}
        <SignOutButton />
      </div>
    </div>
  );

  if (variant === "mobile") {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-1">
          <Avatar name={name} size="sm" ring={profileActive} />
          <span className={cn("text-[10px] font-medium", profileActive ? "text-burgundy" : "text-ink-soft")}>
            Profile
          </span>
        </button>
        <Sheet open={open} onClose={() => setOpen(false)} title="Profile">
          {menuBody}
        </Sheet>
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Your profile">
        <Avatar name={name} ring={profileActive} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-md border border-hairline bg-cream p-3.5 shadow-[0_10px_30px_rgba(58,46,40,0.15)]">
          {menuBody}
        </div>
      )}
    </div>
  );
}
