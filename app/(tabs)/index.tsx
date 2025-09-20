import * as FileSystem from "expo-file-system";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import PolygonSelection from "../../components/PolygonSelection";
import ShowParcelColors from "../../components/ShowParcelColors";
import ShowPolygonFiles from "../../components/ShowPolygonFiles";
import { useGeolocation } from "../../hooks/useGeolocation";
import coordinatesData from "./coordinates.json";
import { loadCadastrePolygons } from "./loadCadastre";
import parcelColorsData from "./parcelColors.json";

// DEV constant - set to false for production mode
const DEV = false;

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
  const [showParcelColors, setShowParcelColors] = useState(false);
  const [colorsLoaded, setColorsLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  // État pour stocker les colorations des parcelles
  const [parcelColors, setParcelColors] = useState<
    Record<string, "internal" | "shared" | "forbidden">
  >({});

  // Load cadastre polygons once using cached function
  const cadastrePolygons = useMemo(() => {
    return loadCadastrePolygons();
  }, []);

  // Filtrer les polygones selon le mode DEV
  const displayedPolygons = useMemo(() => {
    if (DEV) {
      // Mode développement : afficher tous les polygones
      console.log(
        `🔧 Mode DEV: Affichage de tous les polygones (${cadastrePolygons.length})`
      );
      return cadastrePolygons;
    } else {
      // Mode production : afficher seulement les polygones colorés
      if (!colorsLoaded || Object.keys(parcelColors).length === 0) {
        return [];
      }

      const filtered = cadastrePolygons.filter(
        (polygon) => parcelColors[polygon.parcelId] !== undefined
      );

      console.log(
        `🎨 Mode production: Polygones colorés seulement (${filtered.length}/${cadastrePolygons.length})`
      );
      return filtered;
    }
  }, [cadastrePolygons, parcelColors, colorsLoaded]);

  // Charger les couleurs au démarrage
  useEffect(() => {
    if (colorsLoaded) return; // Éviter les rechargements multiples

    const loadColors = async () => {
      try {
        // 1. Charger les couleurs depuis le fichier statique du code
        const staticColors = (parcelColorsData as any).parcelColors || {};

        if (DEV) {
          // Mode développement : charger aussi depuis l'appareil
          let deviceColors = {};
          try {
            const filePath = FileSystem.documentDirectory + "parcelColors.json";
            const deviceData = await FileSystem.readAsStringAsync(filePath);
            const parsedDeviceData = JSON.parse(deviceData);
            deviceColors = parsedDeviceData.parcelColors || {};
            console.log(
              "📱 Couleurs chargées depuis l'appareil:",
              Object.keys(deviceColors).length
            );
          } catch (error) {
            console.log("📱 Aucun fichier de couleurs sur l'appareil");
          }

          // 3. Combiner les couleurs (l'appareil a priorité sur le code statique)
          const combinedColors = { ...staticColors, ...deviceColors };
          setParcelColors(combinedColors);

          console.log(
            "🎨 Couleurs totales chargées:",
            Object.keys(combinedColors).length
          );
          console.log(
            "🎨 Depuis le code statique:",
            Object.keys(staticColors).length
          );
          console.log(
            "🎨 Depuis l'appareil:",
            Object.keys(deviceColors).length
          );
        } else {
          // Mode production : seulement le fichier statique
          setParcelColors(staticColors);
          console.log(
            "🎨 Mode production - Couleurs chargées depuis le code:",
            Object.keys(staticColors).length
          );
        }

        setColorsLoaded(true);
      } catch (error) {
        console.error("❌ Erreur lors du chargement des couleurs:", error);
        setColorsLoaded(true);
      }
    };

    loadColors();
  }, [colorsLoaded]);

  // Fonction pour obtenir la couleur d'une parcelle
  const getParcelColor = (parcelId: string) => {
    const zoneType = parcelColors[parcelId];
    switch (zoneType) {
      case "internal":
        return "rgba(0, 0, 255, 0.3)"; // Bleu transparent
      case "shared":
        return "rgba(255, 215, 0, 0.3)"; // Or transparent
      case "forbidden":
        return "rgba(255, 0, 0, 0.3)"; // Rouge transparent
      default:
        return "rgba(0, 0, 0, 0)"; // Transparent par défaut
    }
  };

  // Fonction pour colorier une parcelle (seulement en mode DEV)
  const colorParcel = (parcelId: string) => {
    if (!DEV) return; // Pas de coloration en mode production

    const newColors = { ...parcelColors };
    if (newColors[parcelId] === zoneType) {
      // Si déjà colorié avec cette couleur, on enlève la couleur
      delete newColors[parcelId];
    } else {
      // Sinon on applique la nouvelle couleur
      newColors[parcelId] = zoneType;
    }
    setParcelColors(newColors);
    console.log(`🎨 Parcelle ${parcelId} colorée en ${zoneType}`);
  };

  // Fonction pour exporter les colorations dans un fichier sur l'appareil (seulement en mode DEV)
  const exportColors = async () => {
    if (!DEV) return;

    try {
      const exportData = {
        parcelColors: parcelColors,
        totalParcelles: Object.keys(parcelColors).length,
        derniereModification: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const filePath = FileSystem.documentDirectory + "parcelColors.json";

      await FileSystem.writeAsStringAsync(filePath, jsonString);

      console.log("📤 EXPORT - Fichier sauvegardé:", filePath);
      console.log("📤 Contenu:", jsonString);

      Alert.alert(
        "Export réussi !",
        `${
          Object.keys(parcelColors).length
        } parcelles coloriées sauvegardées.\nFichier: parcelColors.json`
      );
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder le fichier.");
    }
  };

  useEffect(() => {
    if (mapRef.current && !mapInitialized && displayedPolygons.length > 0) {
      // Calculate bounds manually to avoid stack overflow with fitToCoordinates
      let allCoordinates = [...coords];

      if (displayedPolygons.length > 0) {
        // Add all first coordinates from displayed polygons
        displayedPolygons.forEach((polyData) => {
          if (polyData.coordinates.length > 0) {
            allCoordinates.push(polyData.coordinates[0]);
          }
        });
      }

      console.log(
        "📍 Calculating bounds for",
        allCoordinates.length,
        "coordinates"
      );

      if (allCoordinates.length > 0) {
        // Calculate min/max bounds
        let minLat = allCoordinates[0].latitude;
        let maxLat = allCoordinates[0].latitude;
        let minLng = allCoordinates[0].longitude;
        let maxLng = allCoordinates[0].longitude;

        allCoordinates.forEach((coord) => {
          minLat = Math.min(minLat, coord.latitude);
          maxLat = Math.max(maxLat, coord.latitude);
          minLng = Math.min(minLng, coord.longitude);
          maxLng = Math.max(maxLng, coord.longitude);
        });

        // Add padding
        const latPadding = (maxLat - minLat) * 0.1;
        const lngPadding = (maxLng - minLng) * 0.1;

        const region = {
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: maxLat - minLat + latPadding,
          longitudeDelta: maxLng - minLng + lngPadding,
        };

        console.log("📍 Setting region:", region);
        mapRef.current.animateToRegion(region, 1000);
        setMapInitialized(true);
      }
    }
  }, [mapInitialized, displayedPolygons.length]);

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
        mapType="satellite"
      >
        <Polygon
          coordinates={coords}
          strokeColor="rgba(0,0,255,0.8)"
          strokeWidth={2}
          fillColor="rgba(0,0,0,0)"
        />

        {displayedPolygons.map((polyData, idx) => (
          <Polygon
            key={`cadastre-${idx}`}
            coordinates={polyData.coordinates}
            strokeColor={DEV ? "black" : "transparent"}
            strokeWidth={DEV ? 1 : 0}
            fillColor={getParcelColor(polyData.parcelId)}
            tappable={DEV}
            onPress={DEV ? () => colorParcel(polyData.parcelId) : undefined}
          />
        ))}

        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <View style={styles.locationDot}>
              <View style={styles.dot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Bouton pour centrer sur l'utilisateur */}
      {location && (
        <TouchableOpacity
          style={styles.centerBtn}
          onPress={() => {
            if (mapRef.current && location) {
              mapRef.current.animateToRegion(
                {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                },
                1000
              );
            }
          }}
        >
          <Text style={styles.centerIcon}>📍</Text>
        </TouchableOpacity>
      )}

      {/* Composants d'interface seulement en mode DEV */}
      {DEV && (
        <>
          <PolygonSelection
            zoneType={zoneType}
            onZoneTypeChange={setZoneType}
          />

          {/* Boutons de sauvegarde et suppression */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn]}
              onPress={exportColors}
              disabled={Object.keys(parcelColors).length === 0}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Exporter ({Object.keys(parcelColors).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.discardBtn]}
              onPress={() => {
                setParcelColors({});
                Alert.alert(
                  "Annulé",
                  "Toutes les colorations ont été effacées."
                );
              }}
              disabled={Object.keys(parcelColors).length === 0}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Effacer
              </Text>
            </TouchableOpacity>
          </View>

          {!showFiles && !showParcelColors && (
            <>
              <TouchableOpacity
                style={[styles.toggleBtn, { top: 90 }]}
                onPress={() => setShowParcelColors(true)}
              >
                <Text style={{ color: "#007AFF", fontWeight: "bold" }}>
                  Voir parcelles coloriées
                </Text>
              </TouchableOpacity>
            </>
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

          {showParcelColors && (
            <View
              style={{
                position: "absolute",
                top: 80,
                left: 20,
                right: 20,
                zIndex: 100,
              }}
            >
              <ShowParcelColors />
              <TouchableOpacity
                style={[styles.toggleBtn, { top: 0, backgroundColor: "#ffe" }]}
                onPress={() => setShowParcelColors(false)}
              >
                <Text style={{ color: "#007AFF", fontWeight: "bold" }}>
                  Fermer
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  locationDot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#007AFF",
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  centerBtn: {
    position: "absolute",
    top: 100,
    right: 20,
    width: 48,
    height: 48,
    backgroundColor: "white",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  centerIcon: {
    fontSize: 20,
  },
});
