"use server";

import {
  createShoot,
  suggestShootDates,
  type ConfirmShootInput,
  type SuggestDatesInput,
} from "@/server/shoot-planning";
import { requireActiveOrganiserFilm } from "@/server/organiser";

function requireFilmWindow(film: { dateRangeStart: Date | null; dateRangeEnd: Date | null }) {
  if (!film.dateRangeStart || !film.dateRangeEnd) throw new Error("Film has no working date range set");
  return { start: film.dateRangeStart, end: film.dateRangeEnd };
}

export async function suggestDates(input: SuggestDatesInput) {
  const { organizationId, film } = await requireActiveOrganiserFilm();
  const filmWindow = requireFilmWindow(film);
  return suggestShootDates(organizationId, filmWindow, input);
}

export async function confirmShoot(input: ConfirmShootInput) {
  const { organizationId } = await requireActiveOrganiserFilm();
  const shoot = await createShoot(organizationId, input);
  // Return the id rather than redirect() here — this is called directly from
  // a client event handler (not a <form action>), and redirect()'s internal
  // throw would otherwise land in the caller's try/catch as a fake error
  // (surfaced to the user as the literal text "NEXT_REDIRECT"). The caller
  // navigates itself with router.push once this resolves successfully.
  return { id: shoot.id };
}
