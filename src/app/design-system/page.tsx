"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DayChips } from "@/components/ui/day-chips";
import { ListRow } from "@/components/ui/list-row";
import { BottomTabBar, DEFAULT_NAV_ITEMS, TopNav } from "@/components/ui/nav";
import { OptGroup } from "@/components/ui/opt-group";
import { PillRow } from "@/components/ui/pill-row";
import { ProportionBar } from "@/components/ui/proportion-bar";
import { RoleChip } from "@/components/ui/role-chip";
import { Sheet } from "@/components/ui/sheet";
import { StatusDot } from "@/components/ui/status-dot";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";
import { Toast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";

const SWATCHES = [
  { name: "Cream", hex: "#FBF6EF", role: "Primary background", className: "bg-cream border border-hairline" },
  { name: "Cream Deep", hex: "#F3EADC", role: "Secondary background", className: "bg-cream-deep border border-hairline" },
  { name: "Ink", hex: "#3A2E28", role: "Text, filled buttons", className: "bg-ink" },
  { name: "Ink Soft", hex: "#8A7B6E", role: "Secondary text", className: "bg-ink-soft" },
  { name: "Ink Faint", hex: "#B7A996", role: "Placeholder, unknown tier", className: "bg-ink-faint" },
  { name: "Burgundy", hex: "#6E1F2A", role: "Primary accent, Unavailable", className: "bg-burgundy" },
  { name: "Terracotta", hex: "#B5773A", role: "OK tier, Tentative", className: "bg-terracotta" },
  { name: "Forest", hex: "#35563E", role: "Best tier, Accepted", className: "bg-forest" },
  { name: "Taupe", hex: "#DCD2C3", role: "Wrapped, Unknown fill", className: "bg-taupe" },
  { name: "Hairline", hex: "#E6DBCA", role: "Dividers, borders", className: "bg-hairline" },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-6 border-b border-hairline pb-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: string }) {
  return <h3 className="mb-3 mt-7 text-xs font-bold text-ink-soft">{children}</h3>;
}

export default function DesignSystemPage() {
  const [tier, setTier] = useState<"best" | "ok" | "no">("best");
  const [dayMode, setDayMode] = useState<"single" | "multi">("single");
  const [days, setDays] = useState([false, true, false, false, false, false, false]);
  const [roles, setRoles] = useState<Record<string, boolean>>({ Audio: true, Lighting: true, Camera: false });
  const [toggleOn, setToggleOn] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[980px] px-8 py-16 pb-24">
      <div className="mb-16 text-center">
        <div className="font-display text-4xl font-bold italic text-burgundy">Callsheet</div>
        <div className="mt-1.5 text-[13px] text-ink-soft">Component library — real code, not the mockup</div>
      </div>

      <section className="mb-16">
        <SectionTitle>01 · Color</SectionTitle>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="rounded-md border border-hairline p-4">
              <div className={`mb-2.5 h-[34px] w-full rounded-sm ${s.className}`} />
              <div className="text-[12.5px] font-semibold">{s.name}</div>
              <div className="font-mono text-[10.5px] text-ink-soft">{s.hex}</div>
              <div className="mt-0.5 text-[10.5px] text-ink-faint">{s.role}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <SectionTitle>02 · Type</SectionTitle>
        <div className="flex items-baseline gap-5 border-b border-hairline py-3.5">
          <span className="w-32 shrink-0 text-[10.5px] font-bold uppercase tracking-wide text-burgundy">
            Hero — Playfair
          </span>
          <span className="font-display text-3xl font-bold italic">Callsheet</span>
        </div>
        <div className="flex items-baseline gap-5 border-b border-hairline py-3.5">
          <span className="w-32 shrink-0 text-[10.5px] font-bold uppercase tracking-wide text-burgundy">
            Body — Inter
          </span>
          <span className="text-base">8 of 10 crew are free on March 14th.</span>
        </div>
        <div className="flex items-baseline gap-5 py-3.5">
          <span className="w-32 shrink-0 text-[10.5px] font-bold uppercase tracking-wide text-burgundy">
            Data — Space Mono
          </span>
          <span className="font-mono text-sm">MAR 14 · AM · 08/10</span>
        </div>
      </section>

      <section className="mb-16">
        <SectionTitle>03 · Buttons</SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Save availability</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="link">View map →</Button>
        </div>
      </section>

      <section className="mb-16">
        <SectionTitle>04 · Selection controls</SectionTitle>

        <SubTitle>Underline-option (the most reused control)</SubTitle>
        <OptGroup
          aria-label="Availability tier"
          value={tier}
          onChange={setTier}
          options={[
            { value: "best", label: "Best", tone: "forest" },
            { value: "ok", label: "OK", tone: "terracotta" },
            { value: "no", label: "No", tone: "burgundy" },
          ]}
        />

        <SubTitle>Pill-row segmented</SubTitle>
        <PillRow
          aria-label="Shoot length"
          value={dayMode}
          onChange={setDayMode}
          options={[
            { value: "single", label: "Single day" },
            { value: "multi", label: "Multi-day" },
          ]}
        />

        <SubTitle>Day-of-week chips</SubTitle>
        <DayChips
          selected={days}
          onToggle={(i) => setDays((d) => d.map((v, idx) => (idx === i ? !v : v)))}
        />

        <SubTitle>Role chips (multi-select)</SubTitle>
        <div className="flex gap-2">
          {Object.entries(roles).map(([role, on]) => (
            <RoleChip
              key={role}
              label={role}
              selected={on}
              onToggle={() => setRoles((r) => ({ ...r, [role]: !r[role] }))}
            />
          ))}
        </div>

        <SubTitle>Toggle switch — booleans only</SubTitle>
        <Toggle aria-label="Example toggle" checked={toggleOn} onChange={setToggleOn} />
      </section>

      <section className="mb-16">
        <SectionTitle>05 · Status indicators</SectionTitle>

        <SubTitle>Dot + label (preferred over pills at list scale)</SubTitle>
        <div className="mb-2 flex flex-col gap-2">
          <StatusDot tone="forest" label="Accepted" />
          <StatusDot tone="ink-faint" label="Pending" />
          <StatusDot tone="burgundy" label="Declined" />
        </div>

        <SubTitle>Proportion bar</SubTitle>
        <div className="max-w-[280px]">
          <ProportionBar
            segments={[
              { tone: "forest", label: "Accepted", count: 7 },
              { tone: "ink-faint", label: "Pending", count: 2 },
              { tone: "burgundy", label: "Declined", count: 1 },
            ]}
          />
        </div>

        <SubTitle>Avatars</SubTitle>
        <div className="flex gap-2">
          <Avatar name="Jordan" />
          <Avatar name="Priya" />
          <Avatar name="Will" />
        </div>
      </section>

      <section className="mb-16">
        <SectionTitle>06 · Card vs. row — use cards sparingly</SectionTitle>
        <div className="flex flex-wrap items-start gap-8">
          <div>
            <SubTitle>Card (the one loud element)</SubTitle>
            <div className="w-[280px]">
              <Card>
                <div className="text-sm font-bold">Tech Day 3</div>
                <div className="mt-0.5 text-[11px] text-ink-soft">
                  Fri 13 March · needs your response
                </div>
              </Card>
            </div>
          </div>
          <div className="w-[280px]">
            <SubTitle>Flat row (everything else)</SubTitle>
            <ListRow>
              <span>Dress Rehearsal — Day 1</span>
              <span className="font-semibold text-forest">Accepted</span>
            </ListRow>
            <ListRow>
              <span>Blocking Rehearsal</span>
              <span className="font-semibold italic text-terracotta">Tentative</span>
            </ListRow>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <SectionTitle>07 · Navigation</SectionTitle>
        <div className="max-w-sm overflow-hidden rounded-md border border-hairline md:max-w-full">
          <BottomTabBar items={DEFAULT_NAV_ITEMS} activeHref="/" user={{ name: "Jordan" }} />
          <TopNav items={DEFAULT_NAV_ITEMS} activeHref="/" user={{ name: "Jordan" }} />
        </div>
        <p className="mt-2.5 max-w-[620px] text-xs leading-relaxed text-ink-soft">
          Resize the viewport: below <code>md</code> renders <code>BottomTabBar</code>, at{" "}
          <code>md</code> and above renders <code>TopNav</code> instead. No sidebar, ever.
        </p>
      </section>

      <section className="mb-16">
        <SectionTitle>08 · Containers</SectionTitle>
        <SubTitle>Bottom sheet (mobile) / centered modal (desktop) — same content</SubTitle>
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Open example sheet
        </Button>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Recurring rule">
          <p className="mb-4 text-sm text-ink-soft">
            Repeats every week on Tuesday, morning — Unavailable.
          </p>
          <StickyFooterAction>
            <Button variant="primary" onClick={() => setSheetOpen(false)}>
              Save rule
            </Button>
          </StickyFooterAction>
        </Sheet>
      </section>

      <section className="mb-16">
        <SectionTitle>09 · Feedback</SectionTitle>
        <div className="w-[280px]">
          <Toast message="Accepted Tech Day 3" undoLabel="Undo" onUndo={() => {}} />
        </div>
        <p className="mt-2.5 max-w-[620px] text-xs leading-relaxed text-ink-soft">
          Dark toast, bottom-anchored, Undo included whenever the action is reversible.
        </p>
      </section>

      <section>
        <SectionTitle>10 · Voice</SectionTitle>
        <p className="max-w-[620px] text-xs leading-relaxed text-ink-soft">
          No em dashes in product copy, use a comma or period instead, or restructure the sentence.
          No generic AI-assistant phrasing (&quot;let&apos;s dive in,&quot; &quot;unlock,&quot;
          &quot;seamless,&quot; &quot;leverage&quot;). Write like a person telling a crewmate
          something useful.
        </p>
      </section>
    </div>
  );
}
