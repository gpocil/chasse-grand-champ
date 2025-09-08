import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

// Haversine pour la distance (mètres)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocation(minDistance = 5, smoothWindow = 3) {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastCoords = useRef<{ latitude: number; longitude: number } | null>(
    null
  );
  const history = useRef<
    { latitude: number; longitude: number; heading: number }[]
  >([]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          return;
        }

        let loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        setLocation(loc);
        lastCoords.current = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        history.current = [
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading ?? 0,
          },
        ];

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 2000,
            distanceInterval: 1,
          },
          (loc) => {
            const { latitude, longitude, heading } = loc.coords;

            if (lastCoords.current) {
              const dist = getDistance(
                lastCoords.current.latitude,
                lastCoords.current.longitude,
                latitude,
                longitude
              );
              if (dist < minDistance) {
                return; // ignore micro-mouvements
              }
            }

            history.current.push({
              latitude,
              longitude,
              heading: heading ?? 0,
            });
            if (history.current.length > smoothWindow) {
              history.current.shift();
            }

            // moyenne glissante
            const avgLat =
              history.current.reduce((s, p) => s + p.latitude, 0) /
              history.current.length;
            const avgLng =
              history.current.reduce((s, p) => s + p.longitude, 0) /
              history.current.length;
            const avgHeading =
              history.current.reduce(
                (s, p) => s + (p.heading >= 0 ? p.heading : 0),
                0
              ) / history.current.length;

            lastCoords.current = { latitude, longitude };

            setLocation({
              ...loc,
              coords: {
                ...loc.coords,
                latitude: avgLat,
                longitude: avgLng,
                heading: avgHeading, // 👈 heading lissé
              },
            });
          }
        );
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [minDistance, smoothWindow]);

  return { location, errorMsg };
}
