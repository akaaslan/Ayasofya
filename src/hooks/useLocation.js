import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

// Istanbul defaults
const DEFAULT = { lat: 41.0082, lng: 28.9784, tz: 3, city: 'İstanbul' };

/* ── Turkish city database (major cities + coords + timezone) ── */
const CITIES = [
  { name: 'İstanbul',  lat: 41.0082, lng: 28.9784, tz: 3 },
  { name: 'Ankara',    lat: 39.9334, lng: 32.8597, tz: 3 },
  { name: 'İzmir',     lat: 38.4237, lng: 27.1428, tz: 3 },
  { name: 'Bursa',     lat: 40.1885, lng: 29.0610, tz: 3 },
  { name: 'Antalya',   lat: 36.8969, lng: 30.7133, tz: 3 },
  { name: 'Konya',     lat: 37.8746, lng: 32.4932, tz: 3 },
  { name: 'Adana',     lat: 37.0000, lng: 35.3213, tz: 3 },
  { name: 'Gaziantep', lat: 37.0662, lng: 37.3833, tz: 3 },
  { name: 'Diyarbakır',lat: 37.9144, lng: 40.2306, tz: 3 },
  { name: 'Trabzon',   lat: 41.0027, lng: 39.7168, tz: 3 },
  { name: 'Samsun',    lat: 41.2928, lng: 36.3313, tz: 3 },
  { name: 'Erzurum',   lat: 39.9055, lng: 41.2658, tz: 3 },
  { name: 'Kayseri',   lat: 38.7312, lng: 35.4787, tz: 3 },
  { name: 'Eskişehir', lat: 39.7767, lng: 30.5206, tz: 3 },
  { name: 'Mersin',    lat: 36.8121, lng: 34.6415, tz: 3 },
  { name: 'Malatya',   lat: 38.3552, lng: 38.3095, tz: 3 },
  { name: 'Van',       lat: 38.4891, lng: 43.3832, tz: 3 },
  { name: 'Denizli',   lat: 37.7765, lng: 29.0864, tz: 3 },
  { name: 'Şanlıurfa', lat: 37.1591, lng: 38.7969, tz: 3 },
  { name: 'Manisa',    lat: 38.6191, lng: 27.4289, tz: 3 },
];

/**
 * Haversine distance (km) between two lat/lng points.
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest known city to a given lat/lng.
 */
function findNearestCity(lat, lng) {
  let nearest = CITIES[0];
  let minDist = Infinity;
  for (const city of CITIES) {
    const dist = haversine(lat, lng, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }
  return nearest;
}

/**
 * Hook: provides GPS-based location with city name.
 * Returns { lat, lng, tz, city, district, loading, error, refresh, setManualCity }
 */
export function useLocation() {
  const [location, setLocation] = useState({ ...DEFAULT, district: '', loading: true, error: null });

  const fetchLocation = useCallback(async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation({ ...DEFAULT, district: '', loading: false, error: 'permission_denied' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;
      const nearest = findNearestCity(latitude, longitude);

      // Reverse geocode for district/neighborhood name
      let districtName = '';
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          districtName = geo.subregion || geo.district || geo.city || '';
          // Don't duplicate city name
          if (districtName === nearest.name) districtName = '';
        }
      } catch {
        // Reverse geocoding might fail — not critical
      }

      setLocation({
        lat: latitude,
        lng: longitude,
        tz: nearest.tz,
        city: nearest.name,
        district: districtName,
        loading: false,
        error: null,
      });
    } catch (e) {
      setLocation({ ...DEFAULT, district: '', loading: false, error: 'location_error' });
    }
  }, []);

  const setManualCity = useCallback((cityName) => {
    const city = CITIES.find((c) => c.name === cityName);
    if (city) {
      setLocation({
        lat: city.lat,
        lng: city.lng,
        tz: city.tz,
        city: city.name,
        district: '',
        loading: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    lat: location.lat,
    lng: location.lng,
    tz: location.tz,
    city: location.city,
    district: location.district,
    loading: location.loading,
    error: location.error,
    refresh: fetchLocation,
    setManualCity,
  };
}

/** Export the cities list for use in settings */
export const CITY_LIST = CITIES.map((c) => c.name);
