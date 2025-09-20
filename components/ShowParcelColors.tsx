import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PARCEL_COLORS_FILE = FileSystem.documentDirectory + "parcelColors.json";

export default function ShowParcelColors() {
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleShowFile = async () => {
    setLoading(true);
    try {
      const content = await FileSystem.readAsStringAsync(PARCEL_COLORS_FILE);
      setFileContent(content);
    } catch (err) {
      setFileContent(
        "Aucun fichier parcelColors.json trouvé.\nVeuillez d'abord exporter vos colorations."
      );
    }
    setLoading(false);
  };

  const handleCopyToClipboard = async () => {
    if (!fileContent || fileContent.includes("Aucun fichier")) {
      Alert.alert("Erreur", "Aucun contenu à copier.");
      return;
    }

    try {
      await Clipboard.setStringAsync(fileContent);
      Alert.alert(
        "Copié !",
        "Le contenu JSON a été copié dans le presse-papier.\nVous pouvez maintenant le coller dans votre fichier parcelColors.json du code source."
      );
    } catch (error) {
      Alert.alert("Erreur", "Impossible de copier dans le presse-papier.");
    }
  };

  const handleDeleteFile = async () => {
    Alert.alert(
      "Supprimer le fichier",
      "Êtes-vous sûr de vouloir supprimer le fichier parcelColors.json ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(PARCEL_COLORS_FILE);
              setFileContent("");
              Alert.alert("Supprimé", "Le fichier a été supprimé.");
            } catch (error) {
              Alert.alert("Erreur", "Impossible de supprimer le fichier.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parcelles Coloriées</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.showBtn} onPress={handleShowFile}>
          <Text style={styles.buttonText}>Afficher le JSON</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.copyBtn,
            !fileContent || fileContent.includes("Aucun fichier")
              ? styles.disabled
              : null,
          ]}
          onPress={handleCopyToClipboard}
          disabled={!fileContent || fileContent.includes("Aucun fichier")}
        >
          <Text style={styles.buttonText}>Copier</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteFile}>
        <Text style={styles.buttonText}>Supprimer le fichier</Text>
      </TouchableOpacity>

      <ScrollView style={styles.fileContent}>
        <Text selectable style={styles.jsonText}>
          {loading
            ? "Chargement..."
            : fileContent ||
              "Cliquez sur 'Afficher le JSON' pour voir le contenu"}
        </Text>
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
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  showBtn: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  copyBtn: {
    flex: 1,
    backgroundColor: "#34C759",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "#FF3B30",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  disabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  fileContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#333",
  },
});
