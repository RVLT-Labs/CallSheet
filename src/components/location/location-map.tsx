"use client";

import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Read-only pin-on-a-map preview for a shoot or meeting's location, shown once it has coordinates. */
export function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  return (
    <div className="mt-2 h-36 overflow-hidden rounded-md border border-hairline">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={{ lat, lng }}
          defaultZoom={14}
          gestureHandling="cooperative"
          disableDefaultUI
          mapId="callsheet-location-preview"
        >
          <AdvancedMarker position={{ lat, lng }} />
        </Map>
      </APIProvider>
    </div>
  );
}
