import cadastreData from "./cadastre.json";

let cachedPolygons: { latitude: number; longitude: number }[][] | null = null;

export function loadCadastrePolygons(): {
  latitude: number;
  longitude: number;
}[][] {
  // Return cached polygons if already processed
  if (cachedPolygons !== null) {
    return cachedPolygons;
  }

  console.log("📍 Processing cadastre data (ONE TIME ONLY)...");
  console.log("📍 Number of features:", (cadastreData as any).features.length);

  const polygons: { latitude: number; longitude: number }[][] = [];

  (cadastreData as any).features.forEach(
    (feature: any, featureIndex: number) => {
      if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach(
          (multiPoly: any, multiIndex: number) => {
            multiPoly.forEach((poly: any, polyIndex: number) => {
              const coordinates = poly.map(([lng, lat]: [number, number]) => ({
                latitude: lat,
                longitude: lng,
              }));
              polygons.push(coordinates);
            });
          }
        );
      } else if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates.forEach((poly: any, polyIndex: number) => {
          const coordinates = poly.map(([lng, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          }));
          polygons.push(coordinates);
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
