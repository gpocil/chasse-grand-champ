import cadastreData from "./cadastre.json";

type ParcelPolygon = {
  coordinates: { latitude: number; longitude: number }[];
  parcelId: string;
};

let cachedPolygons: ParcelPolygon[] | null = null;

export function loadCadastrePolygons(): ParcelPolygon[] {
  // Return cached polygons if already processed
  if (cachedPolygons !== null) {
    return cachedPolygons;
  }

  console.log("📍 Processing clean cadastre data (ONE TIME ONLY)...");
  console.log("📍 Number of features:", (cadastreData as any).features.length);

  const polygons: ParcelPolygon[] = [];

  (cadastreData as any).features.forEach(
    (feature: any, featureIndex: number) => {
      const fullParcelId = feature.id || `parcelle_${featureIndex}`;

      let bestPolygon: {
        coordinates: { latitude: number; longitude: number }[];
        area: number;
      } | null = null;

      if (feature.geometry.type === "MultiPolygon") {
        // Pour MultiPolygon, prendre le plus grand polygone
        feature.geometry.coordinates.forEach((multiPoly: any) => {
          multiPoly.forEach((poly: any) => {
            const coordinates = poly.map(([lng, lat]: [number, number]) => ({
              latitude: lat,
              longitude: lng,
            }));

            // Calculer l'aire approximative (somme des distances)
            const area = coordinates.length;

            if (!bestPolygon || area > bestPolygon.area) {
              bestPolygon = { coordinates, area };
            }
          });
        });
      } else if (feature.geometry.type === "Polygon") {
        // Pour Polygon, prendre le premier ring (extérieur)
        if (feature.geometry.coordinates.length > 0) {
          const coordinates = feature.geometry.coordinates[0].map(
            ([lng, lat]: [number, number]) => ({
              latitude: lat,
              longitude: lng,
            })
          );
          bestPolygon = { coordinates, area: coordinates.length };
        }
      }

      // Ajouter le polygone pour cette parcelle
      if (bestPolygon) {
        polygons.push({
          coordinates: bestPolygon.coordinates,
          parcelId: fullParcelId, // Utiliser l'ID complet pour la coloration
        });
      }
    }
  );

  console.log(
    `📍 Total parcels processed: ${polygons.length} (CACHED FOR FUTURE USE)`
  );

  // Cache the result
  cachedPolygons = polygons;

  return polygons;
}
