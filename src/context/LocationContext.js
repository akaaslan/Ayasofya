import { createContext, useContext } from 'react';
import { useLocation } from '../hooks/useLocation';

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

export function LocationProvider({ children }) {
  const location = useLocation();
  return (
    <LocationContext.Provider value={location}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  return useContext(LocationContext);
}
