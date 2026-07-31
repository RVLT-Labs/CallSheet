import { Button } from "@/components/ui/button";

const FEATURES = [
  "Availability, half a day at a time (AM/PM), with manual overrides that always win over a recurring rule.",
  "One grid to see who's free across the whole crew before a shoot date gets locked in.",
  "Each film is its own space, crew and invites stay scoped to it.",
  "Tentative and confirmed shoots show different things: what's needed to firm up, versus who's actually coming.",
  "Sign in with a magic link, no password to set up.",
  "Set a film's working dates once and every crew member's calendar bounds itself to that window.",
];

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-6 md:px-10">
        <span className="font-display text-2xl font-bold italic text-burgundy">Callsheet</span>
        <Button variant="secondary" href="/sign-in">
          Sign in
        </Button>
      </header>

      <section className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl font-bold italic text-ink">Callsheet</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Scheduling for student and indie film crews.
        </p>

        <ul className="mt-8 flex flex-col gap-4">
          {FEATURES.map((feature) => (
            <li key={feature} className="border-t border-hairline pt-4 text-[14px] leading-relaxed text-ink-soft">
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Button variant="primary" href="/sign-in">
            Get started
          </Button>
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
