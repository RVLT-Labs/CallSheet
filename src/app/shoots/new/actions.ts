"use server";

import { redirect } from "next/navigation";

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
  redirect(`/shoots?created=${shoot.id}`);
}
