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

  const polygons: ParcelPolygon[] = [];

  (cadastreData as any).features.forEach(
    (feature: any, featureIndex: number) => {
      const parcelId = feature.id || `parcelle_${featureIndex}`;

      if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach(
          (multiPoly: any, multiIndex: number) => {
            multiPoly.forEach((poly: any, polyIndex: number) => {
              const coordinates = poly.map(([lng, lat]: [number, number]) => ({
                latitude: lat,
                longitude: lng,
              }));
              polygons.push({
                coordinates,
                parcelId: `${parcelId}_${multiIndex}_${polyIndex}`,
              });
            });
          }
        );
      } else if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates.forEach((poly: any, polyIndex: number) => {
          const coordinates = poly.map(([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          }));
          polygons.push({
            coordinates,
            parcelId: polyIndex === 0 ? parcelId : `${parcelId}_${polyIndex}`,
          });
        });
      }
    }
  );

  console.log(
    `📍 Total polygons processed: ${polygons.length} (CACHED FOR FUTURE USE)`
  );

  // Cache the result
  cachedPolygons = polygons;

  return polygons;
}
