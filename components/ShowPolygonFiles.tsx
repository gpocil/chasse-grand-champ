import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ZONE_FILES = {
  internal: FileSystem.documentDirectory + "internal.json",
  shared: FileSystem.documentDirectory + "shared.json",
  forbidden: FileSystem.documentDirectory + "forbidden.json",
};

export default function ShowPolygonFiles() {
  const [selectedZone, setSelectedZone] = useState<
    "internal" | "shared" | "forbidden"
  >("internal");
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleShowFile = async () => {
    setLoading(true);
    try {
      const content = await FileSystem.readAsStringAsync(
        ZONE_FILES[selectedZone]
      );
      setFileContent(content);
    } catch (err) {
      setFileContent("Erreur lors de la lecture du fichier");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.zoneSelector}>
        {Object.keys(ZONE_FILES).map((zone) => (
          <TouchableOpacity
            key={zone}
            style={[
              styles.zoneBtn,
              selectedZone === zone ? styles.selected : null,
            ]}
            onPress={() => setSelectedZone(zone as any)}
          >
            <Text
              style={{ color: selectedZone === zone ? "white" : "#007AFF" }}
            >
              {zone.charAt(0).toUpperCase() + zone.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.showBtn} onPress={handleShowFile}>
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Afficher le fichier JSON
        </Text>
      </TouchableOpacity>
      <ScrollView style={styles.fileContent}>
        <Text selectable>{loading ? "Chargement..." : fileContent}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f8f8",
  },
  zoneSelector: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 10,
  },
  zoneBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#007AFF",
    marginHorizontal: 5,
  },
  selected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  showBtn: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  fileContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    maxHeight: 300,
  },
});
