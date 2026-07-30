import Link from "next/link";

// Stub home page. The real Today/schedule screen (design system §5, spec
// §4.4/§4.7) is built in issue #11 once auth and shoots exist to show.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="font-display text-4xl font-bold italic text-burgundy">Callsheet</span>
      <p className="max-w-sm text-sm text-ink-soft">
        The Today screen lands in issue #11. In the meantime, see the{" "}
        <Link href="/design-system" className="font-semibold text-burgundy">
          component library
        </Link>
        .
      </p>
    </div>
  );
}
