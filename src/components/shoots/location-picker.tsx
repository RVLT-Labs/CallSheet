"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, useMapsLibrary } from "@vis.gl/react-google-maps";

import { TextField } from "@/components/ui/text-field";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export type LocationFields = {
  locationAddress: string;
  locationMapUrl: string;
  locationPlaceId: string | null;
  locationLat: number | null;
  locationLng: number | null;
};

type LocationPickerProps = {
  value: LocationFields;
  onChange: (next: LocationFields) => void;
};

/**
 * Shoot location address field. With NEXT_PUBLIC_GOOGLE_MAPS_API_KEY set this
 * becomes a Places autocomplete that also captures coordinates + a map link
 * and shows a small preview map; without a key it degrades to the plain
 * address text field it replaced, so local dev works without Maps billing set up.
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <TextField
        label="Location address"
        value={value.locationAddress}
        onChange={(e) => onChange({ ...value, locationAddress: e.target.value })}
      />
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <AddressAutocomplete value={value} onChange={onChange} />
      {value.locationLat != null && value.locationLng != null && (
        <div className="mb-[18px] h-40 overflow-hidden rounded-md border border-hairline">
          <Map
            defaultCenter={{ lat: value.locationLat, lng: value.locationLng }}
            defaultZoom={15}
            gestureHandling="cooperative"
            disableDefaultUI
            mapId="callsheet-location-picker"
          >
            <AdvancedMarker position={{ lat: value.locationLat, lng: value.locationLng }} />
          </Map>
        </div>
      )}
    </APIProvider>
  );
}

function AddressAutocomplete({ value, onChange }: LocationPickerProps) {
  const placesLib = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Kept in refs (not deps) so the place_changed listener always calls the latest
  // onChange/value without re-attaching the Google widget on every keystroke.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "place_id", "url"],
    });
    setAutocomplete(ac);
    return () => google.maps.event.clearInstanceListeners(ac);
  }, [placesLib]);

  useEffect(() => {
    if (!autocomplete) return;
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const lat = place.geometry?.location?.lat() ?? null;
      const lng = place.geometry?.location?.lng() ?? null;
      onChangeRef.current({
        locationAddress: place.formatted_address ?? valueRef.current.locationAddress,
        locationMapUrl: place.url ?? valueRef.current.locationMapUrl,
        locationPlaceId: place.place_id ?? null,
        locationLat: lat,
        locationLng: lng,
      });
    });
    return () => listener.remove();
  }, [autocomplete]);

  return (
    <TextField
      ref={inputRef}
      label="Location address"
      defaultValue={value.locationAddress}
      placeholder="Start typing an address…"
      onChange={(e) =>
        onChange({
          ...valueRef.current,
          locationAddress: e.target.value,
          // A hand-edited address no longer matches the picked place.
          locationPlaceId: null,
          locationLat: null,
          locationLng: null,
        })
      }
    />
  );
}
