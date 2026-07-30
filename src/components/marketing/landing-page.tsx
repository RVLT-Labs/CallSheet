"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DayChips } from "@/components/ui/day-chips";
import { ListRow } from "@/components/ui/list-row";
import { OptGroup } from "@/components/ui/opt-group";
import { ProportionBar } from "@/components/ui/proportion-bar";
import { StatusDot } from "@/components/ui/status-dot";
import { PhoneMockup } from "@/components/marketing/phone-mockup";

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

      <section className="overflow-x-auto px-6 pb-14">
        <div className="mx-auto flex w-fit gap-6">
          <PhoneMockup label="Set your availability">
            <p className="font-display text-sm font-bold italic text-burgundy">Tech Day 3</p>
            <p className="mb-3 text-[10px] text-ink-soft">Fri 14 March</p>
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
            <p className="mb-2 mt-4 text-[10px] font-semibold text-ink-soft">Repeats weekly</p>
            <DayChips selected={days} onToggle={() => {}} />
          </PhoneMockup>

          <PhoneMockup label="See today at a glance">
            <Card>
              <div className="text-[13px] font-bold">Tech Day 3</div>
              <div className="mt-0.5 text-[10.5px] text-ink-soft">
                Fri 13 March · needs your response
              </div>
            </Card>
            <div className="mt-1">
              <ListRow>
                <span className="text-[12px]">Dress Rehearsal</span>
                <StatusDot tone="forest" label="Accepted" />
              </ListRow>
              <ListRow>
                <span className="text-[12px]">Blocking Rehearsal</span>
                <StatusDot tone="terracotta" label="Tentative" />
              </ListRow>
            </div>
          </PhoneMockup>

          <PhoneMockup label="Check the whole crew">
            <p className="mb-3 text-[13px] font-bold">8 of 10 crew are free</p>
            <ProportionBar
              segments={[
                { tone: "forest", label: "Free", count: 8 },
                { tone: "terracotta", label: "Maybe", count: 1 },
                { tone: "burgundy", label: "Not free", count: 1 },
              ]}
            />
            <div className="mt-4 flex gap-1.5">
              <Avatar name="Jordan" />
              <Avatar name="Priya" />
              <Avatar name="Will" />
              <Avatar name="Sam" />
            </div>
          </PhoneMockup>
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
