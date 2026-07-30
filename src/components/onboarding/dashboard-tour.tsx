"use client";

import { usePathname, useRouter } from "next/navigation";

import { ProductTour, type TourStep } from "@/components/ui/product-tour";

const ORGANISER_TOUR_STEPS: TourStep[] = [
  {
    target: "nav-availability",
    title: "Track your crew's availability",
    body: "Once you invite your crew, their availability shows up here as a calendar you can scan at a glance.",
  },
  {
    target: "nav-shoots",
    title: "Plan shoots around it",
    body: "Everything you've scheduled lives here, tentative and confirmed side by side.",
  },
  {
    target: "quick-crew-grid",
    title: "See everyone at once",
    body: "This grid lines up every crew member's availability together, so a clash jumps out immediately.",
  },
  {
    target: "quick-plan-shoot",
    title: "Suggested dates, ready when you are",
    body: "This ranks the best dates for your whole crew automatically, once their availability is in.",
  },
];

/**
 * Auto-launches once, right after a self-signup organiser finishes the
 * welcome flow (film-creation-wizard.tsx redirects here with ?tour=1).
 * Strips the query param once the tour ends so leaving and coming back
 * doesn't replay it.
 */
export function DashboardTour() {
  const router = useRouter();
  const pathname = usePathname();

  function finish() {
    router.replace(pathname);
  }

  return <ProductTour steps={ORGANISER_TOUR_STEPS} onFinish={finish} />;
}
