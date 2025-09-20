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

  console.log("📍 Processing cadastre data (ONE TIME ONLY)...");
  console.log("📍 Number of features:", (cadastreData as any).features.length);

  const polygonMap = new Map<string, ParcelPolygon>();

  (cadastreData as any).features.forEach(
    (feature: any, featureIndex: number) => {
      const fullParcelId = feature.id || `parcelle_${featureIndex}`;
      // Extract base ID (without _0_0 suffix) for deduplication
      const baseParcelId = fullParcelId.replace(/_\d+_\d+$/, "");

      // Skip if we already have this parcel
      if (polygonMap.has(baseParcelId)) {
        console.log(
          `⚠️ Parcelle dupliquée ignorée: ${fullParcelId} (base: ${baseParcelId})`
        );
        return;
      }

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

      // Ajouter le meilleur polygone pour cette parcelle
      if (bestPolygon) {
        polygonMap.set(baseParcelId, {
          coordinates: bestPolygon.coordinates,
          parcelId: fullParcelId, // Utiliser l'ID complet pour la coloration
        });
      }
    }
  );

  const polygons = Array.from(polygonMap.values());

  console.log(
    `📍 Total unique parcels processed: ${polygons.length} (CACHED FOR FUTURE USE)`
  );
  console.log(
    `📍 Features in source: ${(cadastreData as any).features.length}`
  );

  // Cache the result
  cachedPolygons = polygons;

  return polygons;
}
