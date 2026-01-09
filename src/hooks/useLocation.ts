import { useState, useCallback } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

      // Try with high accuracy first, fallback to low accuracy for Opera and some mobile browsers
      const tryGetPosition = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setState({ latitude, longitude, error: null, loading: false });
            resolve({ latitude, longitude });
          },
          (error) => {
            // If high accuracy fails with timeout or unavailable, try low accuracy
            if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
              console.log('High accuracy failed, trying low accuracy...');
              tryGetPosition(false);
              return;
            }
            
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
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 10000 : 15000,
            maximumAge: 0,
          }
        );
      };

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
