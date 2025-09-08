import * as FileSystem from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import { useCreatePolygons } from "../../hooks/useCreatePolygon";
import { useGeolocation } from "../../hooks/useGeolocation";
import PolygonSelection from "../PolygonSelection";
import ShowPolygonFiles from "../ShowPolygonFiles";
import coordinatesData from "./coordinates.json";

export default function HomeScreen() {
  const mapRef = useRef<MapView | null>(null);
  const { location, errorMsg } = useGeolocation(5, 5);

  const coords = coordinatesData.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  // état sélectionné : "internal" | "shared" | "forbidden"
  const [zoneType, setZoneType] = useState<"internal" | "shared" | "forbidden">(
    "internal"
  );
  const {
    polygons,
    currentPolygon,
    addPoint,
    savePolygons,
    loadPolygons,
    deletePolygon,
    setCurrentZone,
    setCurrentPolygon,
    setPolygons,
  } = useCreatePolygons();
  const [showFiles, setShowFiles] = useState(false);

  // Helper function: point-in-polygon detection (ray casting algorithm)
  const isPointInPolygon = (
    point: { latitude: number; longitude: number },
    polygon: { latitude: number; longitude: number }[]
  ) => {
    let x = point.latitude,
      y = point.longitude;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i].latitude,
        yi = polygon[i].longitude;
      let xj = polygon[j].latitude,
        yj = polygon[j].longitude;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Handle long press on map to delete polygon
  const handleMapLongPress = (e: any) => {
    const pressedPoint = e.nativeEvent.coordinate;

    // Check if the pressed point is inside any saved polygon
    for (let i = 0; i < polygons.length; i++) {
      if (isPointInPolygon(pressedPoint, polygons[i])) {
        Alert.alert(
          "Supprimer le polygone",
          "Voulez-vous supprimer ce polygone ?",
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Supprimer",
              style: "destructive",
              onPress: () => deletePolygon(i, zoneType),
            },
          ]
        );
        return; // Stop after finding the first polygon
      }
    }
  };

  // Check if two polygons overlap
  const polygonsOverlap = (
    poly1: { latitude: number; longitude: number }[],
    poly2: { latitude: number; longitude: number }[]
  ) => {
    // Check if any point of poly1 is inside poly2
    for (let point of poly1) {
      if (isPointInPolygon(point, poly2)) {
        return true;
      }
    }
    // Check if any point of poly2 is inside poly1
    for (let point of poly2) {
      if (isPointInPolygon(point, poly1)) {
        return true;
      }
    }
    return false;
  };

  // Find intersection point between two line segments
  const lineIntersection = (
    p1: { latitude: number; longitude: number },
    p2: { latitude: number; longitude: number },
    p3: { latitude: number; longitude: number },
    p4: { latitude: number; longitude: number }
  ) => {
    const x1 = p1.longitude,
      y1 = p1.latitude;
    const x2 = p2.longitude,
      y2 = p2.latitude;
    const x3 = p3.longitude,
      y3 = p3.latitude;
    const x4 = p4.longitude,
      y4 = p4.latitude;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        latitude: y1 + t * (y2 - y1),
        longitude: x1 + t * (x2 - x1),
      };
    }
    return null;
  };

  // Check if a point is on the polygon boundary (edge)
  const isPointOnPolygonEdge = (
    point: { latitude: number; longitude: number },
    polygon: { latitude: number; longitude: number }[]
  ) => {
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];

      // Check if point is on line segment p1-p2
      const distance =
        Math.abs(
          (p2.longitude - p1.longitude) * (p1.latitude - point.latitude) -
            (p1.longitude - point.longitude) * (p2.latitude - p1.latitude)
        ) /
        Math.sqrt(
          Math.pow(p2.longitude - p1.longitude, 2) +
            Math.pow(p2.latitude - p1.latitude, 2)
        );

      // If point is very close to the edge and within the segment bounds
      if (distance < 0.00001) {
        const minX = Math.min(p1.longitude, p2.longitude);
        const maxX = Math.max(p1.longitude, p2.longitude);
        const minY = Math.min(p1.latitude, p2.latitude);
        const maxY = Math.max(p1.latitude, p2.latitude);

        if (
          point.longitude >= minX &&
          point.longitude <= maxX &&
          point.latitude >= minY &&
          point.latitude <= maxY
        ) {
          return true;
        }
      }
    }
    return false;
  };

  // More accurate polygon merge that connects through intersection points
  const mergePolygons = (
    poly1: { latitude: number; longitude: number }[],
    poly2: { latitude: number; longitude: number }[]
  ) => {
    console.log("🔄 Starting accurate polygon merge...");

    // Step 1: Find intersection points with edge information
    const intersections: {
      point: { latitude: number; longitude: number };
      poly1EdgeIndex: number;
      poly2EdgeIndex: number;
      distanceOnPoly1Edge: number;
      distanceOnPoly2Edge: number;
    }[] = [];

    for (let i = 0; i < poly1.length; i++) {
      const p1 = poly1[i];
      const p2 = poly1[(i + 1) % poly1.length];

      for (let j = 0; j < poly2.length; j++) {
        const p3 = poly2[j];
        const p4 = poly2[(j + 1) % poly2.length];

        const intersection = lineIntersection(p1, p2, p3, p4);
        if (intersection) {
          // Calculate distance along each edge for proper ordering
          const distOnPoly1 = Math.sqrt(
            Math.pow(intersection.latitude - p1.latitude, 2) +
              Math.pow(intersection.longitude - p1.longitude, 2)
          );
          const distOnPoly2 = Math.sqrt(
            Math.pow(intersection.latitude - p3.latitude, 2) +
              Math.pow(intersection.longitude - p3.longitude, 2)
          );

          intersections.push({
            point: intersection,
            poly1EdgeIndex: i,
            poly2EdgeIndex: j,
            distanceOnPoly1Edge: distOnPoly1,
            distanceOnPoly2Edge: distOnPoly2,
          });
        }
      }
    }

    console.log(`Found ${intersections.length} intersection points`);

    if (intersections.length === 0) {
      // No intersections, just combine external points
      const allPoints = [...poly1, ...poly2];
      const externalPoints = allPoints.filter((point) => {
        return !isPointInPolygon(
          point,
          poly1 === allPoints.slice(0, poly1.length) ? poly2 : poly1
        );
      });
      return externalPoints.length > 2 ? externalPoints : allPoints;
    }

    // Step 2: Build segments for each polygon with intersection points inserted
    const buildSegmentsWithIntersections = (
      polygon: { latitude: number; longitude: number }[],
      isFirstPolygon: boolean
    ) => {
      const segments: { latitude: number; longitude: number }[] = [];

      for (let i = 0; i < polygon.length; i++) {
        segments.push(polygon[i]);

        // Find intersections on this edge
        const edgeIntersections = intersections
          .filter((int) =>
            isFirstPolygon ? int.poly1EdgeIndex === i : int.poly2EdgeIndex === i
          )
          .sort((a, b) =>
            isFirstPolygon
              ? a.distanceOnPoly1Edge - b.distanceOnPoly1Edge
              : a.distanceOnPoly2Edge - b.distanceOnPoly2Edge
          );

        // Add intersection points in order along the edge
        for (const int of edgeIntersections) {
          segments.push(int.point);
        }
      }

      return segments;
    };

    const poly1WithIntersections = buildSegmentsWithIntersections(poly1, true);
    const poly2WithIntersections = buildSegmentsWithIntersections(poly2, false);

    // Step 3: Trace the outer boundary
    const result: { latitude: number; longitude: number }[] = [];
    const visited = new Set<string>();

    const pointKey = (p: { latitude: number; longitude: number }) =>
      `${p.latitude.toFixed(8)},${p.longitude.toFixed(8)}`;

    // Start from the first external point of poly1
    let startIndex = 0;
    for (let i = 0; i < poly1WithIntersections.length; i++) {
      if (!isPointInPolygon(poly1WithIntersections[i], poly2)) {
        startIndex = i;
        break;
      }
    }

    let currentPolygon = poly1WithIntersections;
    let currentIndex = startIndex;
    let isOnPoly1 = true;

    for (
      let step = 0;
      step <
      (poly1WithIntersections.length + poly2WithIntersections.length) * 2;
      step++
    ) {
      const currentPoint = currentPolygon[currentIndex];
      const key = pointKey(currentPoint);

      if (visited.has(key) && result.length > 2) {
        // We've completed the loop
        break;
      }

      if (!visited.has(key)) {
        result.push(currentPoint);
        visited.add(key);
      }

      // Check if current point is an intersection point
      const isIntersection = intersections.some(
        (int) =>
          Math.abs(int.point.latitude - currentPoint.latitude) < 0.00001 &&
          Math.abs(int.point.longitude - currentPoint.longitude) < 0.00001
      );

      if (isIntersection) {
        // Switch to the other polygon at intersection
        const otherPolygon = isOnPoly1
          ? poly2WithIntersections
          : poly1WithIntersections;

        // Find the same intersection point in the other polygon
        let newIndex = -1;
        for (let i = 0; i < otherPolygon.length; i++) {
          if (
            Math.abs(otherPolygon[i].latitude - currentPoint.latitude) <
              0.00001 &&
            Math.abs(otherPolygon[i].longitude - currentPoint.longitude) <
              0.00001
          ) {
            newIndex = i;
            break;
          }
        }

        if (newIndex !== -1) {
          currentPolygon = otherPolygon;
          currentIndex = newIndex;
          isOnPoly1 = !isOnPoly1;
          console.log(
            `Switched to ${isOnPoly1 ? "poly1" : "poly2"} at intersection`
          );
        }
      }

      // Move to next point
      currentIndex = (currentIndex + 1) % currentPolygon.length;
    }

    console.log(`✅ Accurate merge completed with ${result.length} points`);
    return result.length > 2 ? result : [...poly1, ...poly2];
  };

  // Save polygon with overlap detection and merging
  const savePolygonWithMerge = async (
    zoneType: "internal" | "shared" | "forbidden"
  ) => {
    if (currentPolygon.length === 0) return;

    let newPolygons = [...polygons];
    let currentPoly = [...currentPolygon];
    let merged = false;

    // Check for overlaps with existing polygons
    for (let i = 0; i < newPolygons.length; i++) {
      if (polygonsOverlap(currentPoly, newPolygons[i])) {
        // Merge with the overlapping polygon
        const mergedPoly = mergePolygons(currentPoly, newPolygons[i]);
        newPolygons[i] = mergedPoly;
        currentPoly = mergedPoly;
        merged = true;
        console.log(`🔄 Merged overlapping polygons for ${zoneType} zone`);
        break;
      }
    }

    // If no merge occurred, add as new polygon
    if (!merged) {
      newPolygons.push(currentPoly);
    }

    // Update state and save
    setPolygons(newPolygons);
    setCurrentPolygon([]);

    // Save to file
    try {
      const ZONE_FILES = {
        internal: FileSystem.documentDirectory + "internal.json",
        shared: FileSystem.documentDirectory + "shared.json",
        forbidden: FileSystem.documentDirectory + "forbidden.json",
      };

      await FileSystem.writeAsStringAsync(
        ZONE_FILES[zoneType],
        JSON.stringify({ polygons: newPolygons }),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      console.log(`✅ Polygons with merge saved to ${ZONE_FILES[zoneType]}`);
    } catch (err) {
      console.error("❌ Error saving merged polygons", err);
    }
  };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
    // Charger les polygones du type de zone au démarrage
    loadPolygons(zoneType);
    setCurrentZone(zoneType);
    setCurrentPolygon([]);
  }, [zoneType]);

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        mapType="satellite"
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          addPoint(latitude, longitude);
        }}
        onLongPress={handleMapLongPress}
      >
        <Polygon
          coordinates={coords}
          strokeColor="rgba(0,0,255,0.8)"
          strokeWidth={2}
          fillColor="rgba(0,0,0,0)"
        />

        {/* Afficher les polygones sauvegardés */}
        {polygons.map((poly, idx) => (
          <Polygon
            key={"saved-" + idx}
            coordinates={poly}
            strokeColor={
              zoneType === "internal"
                ? "blue"
                : zoneType === "shared"
                ? "gold"
                : "red"
            }
            strokeWidth={1}
            fillColor={
              zoneType === "internal"
                ? "rgba(0,0,255,0.1)"
                : zoneType === "shared"
                ? "rgba(255,215,0,0.2)"
                : "rgba(255,0,0,0.2)"
            }
          />
        ))}
        {/* Afficher le polygone en cours de création */}
        {currentPolygon.length > 0 && (
          <Polygon
            key="current"
            coordinates={currentPolygon}
            strokeColor={
              zoneType === "internal"
                ? "blue"
                : zoneType === "shared"
                ? "gold"
                : "red"
            }
            strokeWidth={3}
            fillColor={
              zoneType === "internal"
                ? "rgba(0,0,255,0.2)"
                : zoneType === "shared"
                ? "rgba(255,215,0,0.2)"
                : "rgba(255,0,0,0.2)"
            }
          />
        )}

        {/* Afficher les points du polygone en cours de création */}
        {currentPolygon.map((point, idx) => (
          <Marker
            key={`current-point-${idx}`}
            coordinate={point}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.pointMarker,
                {
                  backgroundColor:
                    zoneType === "internal"
                      ? "blue"
                      : zoneType === "shared"
                      ? "gold"
                      : "red",
                },
              ]}
            >
              <Text style={styles.pointText}>{idx + 1}</Text>
            </View>
          </Marker>
        ))}

        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
          ></Marker>
        )}
      </MapView>
      <PolygonSelection zoneType={zoneType} onZoneTypeChange={setZoneType} />

      {/* Boutons de sauvegarde et suppression */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.saveBtn]}
          onPress={() =>
            currentPolygon.length > 0 && savePolygonWithMerge(zoneType)
          }
          disabled={currentPolygon.length === 0}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            Sauvegarder
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.discardBtn]}
          onPress={() => setCurrentPolygon([])}
          disabled={currentPolygon.length === 0}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Annuler</Text>
        </TouchableOpacity>
      </View>
      {!showFiles && (
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setShowFiles(true)}
        >
          <Text style={{ color: "#007AFF", fontWeight: "bold" }}>
            Afficher les fichiers JSON
          </Text>
        </TouchableOpacity>
      )}
      {showFiles && (
        <View
          style={{
            position: "absolute",
            top: 80,
            left: 20,
            right: 20,
            zIndex: 100,
          }}
        >
          <ShowPolygonFiles />
          <TouchableOpacity
            style={[styles.toggleBtn, { top: 0, backgroundColor: "#ffe" }]}
            onPress={() => setShowFiles(false)}
          >
            <Text style={{ color: "#007AFF", fontWeight: "bold" }}>
              Masquer les fichiers JSON
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  buttonContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  saveBtn: {
    backgroundColor: "#007AFF",
  },
  discardBtn: {
    backgroundColor: "#FF3B30",
  },
  pointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  pointText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  toggleBtn: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
});
