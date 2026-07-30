import Link from "next/link";

// Stub. The real film creation flow (spec §4.2) is built in issue #5.
export default function NewFilmPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-base font-bold">Film creation lands in issue #5</p>
      <Link href="/" className="text-[13px] font-semibold text-burgundy">
        Back home
      </Link>
    </div>
  );
}
