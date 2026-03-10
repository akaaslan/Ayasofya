import { createContext, useContext } from 'react';

/**
 * LocationContext — shares GPS location state across all screens.
 * Value shape: { lat, lng, tz, city, district, country, loading, error, refresh, setManualCity }
 */
export const LocationContext = createContext({
  lat: 41.0082,
  lng: 28.9784,
  tz: 3,
  city: 'İstanbul',
  district: '',
  country: 'Türkiye',
  loading: false,
  error: null,
  refresh: () => {},
  setManualCity: () => {},
});

export function useLocationContext() {
  return useContext(LocationContext);
}
