"use client";

// Archived marketing landing page (phone mockups + feature grid). Superseded
// by src/components/marketing/landing-page.tsx. Kept for reference only —
// not imported anywhere in the app.

import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DayChips } from "@/components/ui/day-chips";
import { ListRow } from "@/components/ui/list-row";
import { OptGroup } from "@/components/ui/opt-group";
import { ProportionBar } from "@/components/ui/proportion-bar";
import { StatusDot } from "@/components/ui/status-dot";
import { PhoneMockup } from "@/components/marketing/archived/phone-mockup";

const FEATURES = [
  {
    title: "Availability, half a day at a time",
    body: "AM/PM tiers and recurring weekly rules. A manual override always wins over a recurring one.",
  },
  {
    title: "One grid for the whole crew",
    body: "See who's free before a shoot date gets locked in, not after the invite goes out.",
  },
  {
    title: "Each film is its own space",
    body: "Crew, working dates, and invites live under the film, not mixed across your whole contact list.",
  },
  {
    title: "Tentative isn't just a lighter confirmed",
    body: "A tentative shoot shows what it needs to firm up. A confirmed one shows who's actually coming.",
  },
  {
    title: "Sign in with a magic link",
    body: "No password to remember and nothing to set up before your first shoot. Click the link in your invite email.",
  },
  {
    title: "Set the film's working dates once",
    body: "Every crew member's calendar bounds itself to the shoot window automatically, nobody marks availability for a date that doesn't matter.",
  },
];

export function LandingPage() {
  const [tier] = useState<"best" | "ok" | "no">("best");
  const [days] = useState([false, true, true, false, false, true, false]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-6 md:px-10">
        <span className="font-display text-2xl font-bold italic text-burgundy">Callsheet</span>
        <Button variant="secondary" href="/sign-in">
          Sign in
        </Button>
      </header>

      <section className="mx-auto flex max-w-xl flex-col items-center px-6 pb-10 pt-6 text-center md:pt-10">
        <h1 className="font-display text-4xl font-bold italic text-ink md:text-5xl">
          Scheduling for the crew, not the spreadsheet.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Callsheet tracks who&apos;s free, gets a shoot date agreed on, and sends the invite,
          for student and indie film crews who&apos;ve outgrown a group chat.
        </p>
        <div className="mt-6">
          <Button variant="primary" href="/sign-in">
            Get started
          </Button>
        </div>
      </section>

      <section className="px-6 pb-16">
        <p className="mx-auto mb-8 max-w-md text-center text-[13px] text-ink-soft">
          The screens below are the actual components the app ships with, at the size they
          render on a phone, not renders of a design file.
        </p>
        <div className="overflow-x-auto">
          <div className="mx-auto flex w-fit gap-8 px-1 pb-2">
            <PhoneMockup label="Set your availability">
              <div className="flex-1 overflow-y-auto px-4 pt-9 pb-4">
                <h2 className="font-display mb-1 text-lg font-bold italic text-burgundy">
                  Your availability
                </h2>
                <p className="mb-5 text-[11px] text-ink-soft">Verdant Hour · 3–21 Mar</p>

                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  Tech Day 3 · Fri 14 March
                </p>
                <OptGroup
                  aria-label="Availability tier"
                  value={tier}
                  onChange={() => {}}
                  options={[
                    { value: "best", label: "Best", tone: "forest" },
                    { value: "ok", label: "OK", tone: "terracotta" },
                    { value: "no", label: "No", tone: "burgundy" },
                  ]}
                />

                <p className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  Repeats weekly
                </p>
                <DayChips selected={days} onToggle={() => {}} />

                <p className="mb-1 mt-6 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  This week
                </p>
                <ListRow>
                  <span className="text-[12px]">Mon 3 Mar · AM</span>
                  <StatusDot tone="forest" label="Best" />
                </ListRow>
                <ListRow>
                  <span className="text-[12px]">Mon 3 Mar · PM</span>
                  <StatusDot tone="terracotta" label="OK" />
                </ListRow>
                <ListRow>
                  <span className="text-[12px]">Tue 4 Mar · AM</span>
                  <StatusDot tone="burgundy" label="No" />
                </ListRow>
                <ListRow>
                  <span className="text-[12px]">Wed 5 Mar · AM</span>
                  <StatusDot tone="ink-faint" label="Unset" />
                </ListRow>
              </div>
            </PhoneMockup>

            <PhoneMockup label="Track who's responded">
              <div className="flex-1 overflow-y-auto px-4 pt-9 pb-4">
                <h2 className="font-display mb-1 text-lg font-bold italic text-burgundy">
                  My shoots
                </h2>
                <p className="mb-5 text-[11px] text-ink-soft">Verdant Hour</p>

                <Card>
                  <div className="text-[13px] font-bold">Tech Day 3</div>
                  <div className="mt-0.5 text-[10.5px] text-ink-soft">
                    Fri 13 March · needs your response
                  </div>
                </Card>

                <p className="mb-1 mt-5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  Upcoming
                </p>
                <ListRow>
                  <span className="text-[12px]">Camera Test</span>
                  <StatusDot tone="forest" label="Accepted" />
                </ListRow>
                <ListRow>
                  <span className="text-[12px]">Blocking Rehearsal</span>
                  <StatusDot tone="terracotta" label="Tentative" />
                </ListRow>
                <ListRow>
                  <span className="text-[12px]">Table Read</span>
                  <StatusDot tone="ink-faint" label="Pending" />
                </ListRow>
                <ListRow>
                  <span className="text-[12px]">Location Scout</span>
                  <StatusDot tone="burgundy" label="Declined" />
                </ListRow>
              </div>
            </PhoneMockup>

            <PhoneMockup label="Check the whole crew">
              <div className="flex-1 overflow-y-auto px-4 pt-9 pb-4">
                <h2 className="font-display mb-1 text-lg font-bold italic text-burgundy">
                  Crew availability
                </h2>
                <p className="mb-5 text-[11px] text-ink-soft">Tech Day 3 · Fri 14 March</p>

                <p className="mb-2 text-[13px] font-bold">8 of 10 crew are free</p>
                <ProportionBar
                  segments={[
                    { tone: "forest", label: "Free", count: 8 },
                    { tone: "terracotta", label: "Maybe", count: 1 },
                    { tone: "burgundy", label: "Not free", count: 1 },
                  ]}
                />

                <p className="mb-1 mt-5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  Crew
                </p>
                {[
                  { name: "Jordan", tone: "forest" as const, label: "Free" },
                  { name: "Priya", tone: "forest" as const, label: "Free" },
                  { name: "Will", tone: "terracotta" as const, label: "Maybe" },
                  { name: "Sam", tone: "burgundy" as const, label: "Not free" },
                ].map((c) => (
                  <ListRow key={c.name}>
                    <span className="flex items-center gap-2 text-[12px]">
                      <Avatar name={c.name} />
                      {c.name}
                    </span>
                    <StatusDot tone={c.tone} label={c.label} />
                  </ListRow>
                ))}
              </div>
            </PhoneMockup>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="border-t border-hairline pt-4">
              <p className="text-[13.5px] font-bold">{f.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-between border-t border-hairline px-6 py-6 text-[13px] md:px-10">
        <span className="font-display font-bold italic text-burgundy">Callsheet</span>
        <a href="/sign-in" className="font-semibold text-burgundy">
          Sign in
        </a>
      </footer>
    </div>
  );
}
