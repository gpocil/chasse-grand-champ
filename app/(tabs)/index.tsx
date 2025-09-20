import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import { useGeolocation } from "../../hooks/useGeolocation";
import PolygonSelection from "../PolygonSelection";
import ShowPolygonFiles from "../ShowPolygonFiles";
import coordinatesData from "./coordinates.json";
import { loadCadastrePolygons } from "./loadCadastre";

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
  const [showFiles, setShowFiles] = useState(false);

  // Load cadastre polygons once using cached function
  const cadastrePolygons = useMemo(() => {
    return loadCadastrePolygons();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      // Fit to both coords and cadastre polygons if available
      let allCoordinates = [...coords];

      if (cadastrePolygons.length > 0) {
        // Add some cadastre coordinates to the fit
        cadastrePolygons.slice(0, 5).forEach((poly) => {
          if (poly.length > 0) {
            allCoordinates.push(poly[0]); // Add first coordinate of each polygon
          }
        });
        console.log("📍 Fitting map to", allCoordinates.length, "coordinates");
      }

      mapRef.current.fitToCoordinates(allCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, []);

  // Separate effect for zone changes (keeping for UI consistency)
  useEffect(() => {
    // Zone type changed, but no functionality connected
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
        mapType="standard"
      >
        <Polygon
          coordinates={coords}
          strokeColor="rgba(0,0,255,0.8)"
          strokeWidth={2}
          fillColor="rgba(0,0,0,0)"
        />

        {cadastrePolygons.map((poly, idx) => (
          <Polygon
            key={`cadastre-${idx}`}
            coordinates={poly}
            strokeColor="black"
            strokeWidth={1}
            fillColor="rgba(0,0,0,0)"
          />
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
          onPress={() => {}}
          disabled={true}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            Sauvegarder
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.discardBtn]}
          onPress={() => {}}
          disabled={true}
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
