import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
    setCurrentZone,
    setCurrentPolygon,
  } = useCreatePolygons();
  const [showFiles, setShowFiles] = useState(false);

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
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => currentPolygon.length > 0 && savePolygons(zoneType)}
        disabled={currentPolygon.length === 0}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Sauvegarder le polygone
        </Text>
      </TouchableOpacity>
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
  saveBtn: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
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
