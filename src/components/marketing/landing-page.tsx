import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "See who's free",
    body: "A shared grid shows the whole crew's availability before a shoot date gets locked in.",
  },
  {
    title: "One space per film",
    body: "Crew, working dates, and invites stay scoped to the film they belong to.",
  },
  {
    title: "Tentative vs confirmed",
    body: "A tentative shoot shows what still needs to firm up. A confirmed one shows who's actually coming.",
  },
  {
    title: "Easy to join",
    body: "Crew get an invite by email and are set up in a couple of taps, nothing to install.",
  },
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

        <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="border-t border-hairline pt-4">
              <p className="text-[13.5px] font-bold">{feature.title}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{feature.body}</p>
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
