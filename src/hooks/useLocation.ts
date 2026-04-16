import { useState, useCallback } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

function normalizeCoord(n: number): number {
  if (!Number.isFinite(n) || n === 0) return n;
  const abs = Math.abs(n);
  if (abs <= 180) return n;
  const intDigits = Math.floor(Math.log10(abs)) + 1;
  return n / Math.pow(10, intDigits - 2);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  lat1 = normalizeCoord(lat1);
  lon1 = normalizeCoord(lon1);
  lat2 = normalizeCoord(lat2);
  lon2 = normalizeCoord(lon2);
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const getLocation = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      if (!navigator.geolocation) {
        const error = 'Konum servisi tarayıcınızda desteklenmiyor.';
        setState((prev) => ({ ...prev, loading: false, error }));
        reject(new Error(error));
        return;
      }

      let hasResolved = false;
      let attempts = 0;
      const maxAttempts = 2;

      // Helper function to handle successful position
      const handleSuccess = (position: GeolocationPosition) => {
        if (hasResolved) return;
        hasResolved = true;
        const { latitude, longitude } = position.coords;
        setState({ latitude, longitude, error: null, loading: false });
        resolve({ latitude, longitude });
      };

      // Helper function to handle errors
      const handleError = (error: GeolocationPositionError, highAccuracy: boolean) => {
        if (hasResolved) return;
        
        attempts++;
        
        // If high accuracy fails (any error except permission denied), try low accuracy
        if (highAccuracy && error.code !== error.PERMISSION_DENIED && attempts < maxAttempts) {
          console.log('High accuracy failed, trying low accuracy...', error.code, error.message);
          tryGetPosition(false);
          return;
        }
        
        hasResolved = true;
        let errorMessage = 'Konum alınamadı.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini verin.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Konum bilgisi alınamıyor. Lütfen konum servislerinin açık olduğundan emin olun.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Konum isteği zaman aşımına uğradı. Lütfen tekrar deneyin.';
            break;
        }
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        reject(new Error(errorMessage));
      };

      // Try to get position with specified accuracy
      const tryGetPosition = (highAccuracy: boolean) => {
        // Desktop browsers often work better with low accuracy (IP-based)
        // Mobile browsers work better with high accuracy (GPS)
        const options: PositionOptions = {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 20000, // Longer timeout for desktop
          maximumAge: highAccuracy ? 0 : 30000, // Allow cached position for low accuracy
        };

        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (error) => handleError(error, highAccuracy),
          options
        );
      };

      // Start with high accuracy, will fallback to low accuracy if needed
      tryGetPosition(true);
    });
  }, []);

  const checkDistance = useCallback(
    (restaurantLat: number, restaurantLon: number, maxDistance: number): boolean => {
      if (state.latitude === null || state.longitude === null) return false;
      const distance = calculateDistance(state.latitude, state.longitude, restaurantLat, restaurantLon);
      return distance <= maxDistance;
    },
    [state.latitude, state.longitude]
  );

  // Direct distance check using provided coordinates (not state)
  const checkDistanceWithCoords = useCallback(
    (userLat: number, userLon: number, restaurantLat: number, restaurantLon: number, maxDistance: number): boolean => {
      const distance = calculateDistance(userLat, userLon, restaurantLat, restaurantLon);
      return distance <= maxDistance;
    },
    []
  );

  const getDistanceFromRestaurant = useCallback(
    (restaurantLat: number, restaurantLon: number): number | null => {
      if (state.latitude === null || state.longitude === null) return null;
      return calculateDistance(state.latitude, state.longitude, restaurantLat, restaurantLon);
    },
    [state.latitude, state.longitude]
  );

  // Direct distance calculation using provided coordinates (not state)
  const getDistanceWithCoords = useCallback(
    (userLat: number, userLon: number, restaurantLat: number, restaurantLon: number): number => {
      return calculateDistance(userLat, userLon, restaurantLat, restaurantLon);
    },
    []
  );

  return {
    ...state,
    getLocation,
    checkDistance,
    checkDistanceWithCoords,
    getDistanceFromRestaurant,
    getDistanceWithCoords,
  };
}
