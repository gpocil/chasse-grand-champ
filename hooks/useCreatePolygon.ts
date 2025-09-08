import * as FileSystem from "expo-file-system";
import { useState } from "react";

// Fichiers pour chaque type de zone
const ZONE_FILES = {
  internal: FileSystem.documentDirectory + "internal.json",
  shared: FileSystem.documentDirectory + "shared.json",
  forbidden: FileSystem.documentDirectory + "forbidden.json",
};

export function useCreatePolygons() {
  const [polygons, setPolygons] = useState<
    { latitude: number; longitude: number }[][]
  >([]);
  const [currentZone, setCurrentZone] = useState<
    "internal" | "shared" | "forbidden"
  >("internal");
  const [currentPolygon, setCurrentPolygon] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  // Ajouter un point au polygone en cours
  const addPoint = (lat: number, lng: number) => {
    setCurrentPolygon((prev) => [...prev, { latitude: lat, longitude: lng }]);
  };

  // Sauvegarder le polygone en cours et tous les polygones
  const savePolygons = async (zone?: "internal" | "shared" | "forbidden") => {
    const zoneType = zone || currentZone;
    const newPolygons =
      currentPolygon.length > 0 ? [...polygons, currentPolygon] : polygons;
    setPolygons(newPolygons);
    setCurrentPolygon([]);
    try {
      await FileSystem.writeAsStringAsync(
        ZONE_FILES[zoneType],
        JSON.stringify({ polygons: newPolygons }),
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );
      console.log(`✅ Polygons saved to ${ZONE_FILES[zoneType]}`);
      setPolygons(newPolygons);
    } catch (err) {
      console.error("❌ Error saving polygons", err);
    }
  };

  // Charger les polygones pour le type de zone courant
  const loadPolygons = async (zone?: "internal" | "shared" | "forbidden") => {
    const zoneType = zone || currentZone;
    try {
      const content = await FileSystem.readAsStringAsync(ZONE_FILES[zoneType]);
      const parsed = JSON.parse(content);
      if (parsed.polygons) {
        setPolygons(parsed.polygons);
      } else {
        setPolygons([]);
      }
      setCurrentPolygon([]);
    } catch {
      setPolygons([]);
      setCurrentPolygon([]);
      console.log(`ℹ️ No polygons file found yet for ${zoneType}`);
    }
  };

  // Supprimer un polygone par index
  const deletePolygon = async (
    index: number,
    zone?: "internal" | "shared" | "forbidden"
  ) => {
    const zoneType = zone || currentZone;
    const newPolygons = polygons.filter((_, idx) => idx !== index);
    setPolygons(newPolygons);
    try {
      await FileSystem.writeAsStringAsync(
        ZONE_FILES[zoneType],
        JSON.stringify({ polygons: newPolygons }),
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );
      console.log(`✅ Polygon deleted from ${ZONE_FILES[zoneType]}`);
    } catch (err) {
      console.error("❌ Error deleting polygon", err);
    }
  };

  return {
    polygons,
    currentPolygon,
    addPoint,
    savePolygons,
    loadPolygons,
    deletePolygon,
    currentZone,
    setCurrentZone,
    setCurrentPolygon,
  };
}
