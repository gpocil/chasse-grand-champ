import { FontAwesome } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type ZoneType = "internal" | "shared" | "forbidden";

interface PolygonSelectionProps {
  zoneType: ZoneType;
  onZoneTypeChange: (type: ZoneType) => void;
}

export default function PolygonSelection({
  zoneType,
  onZoneTypeChange,
}: PolygonSelectionProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.fabContainer}>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <FontAwesome name="circle" size={24} color={getColor(zoneType)} />
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawer}>
            <Text style={styles.title}>Sélectionnez la zone</Text>
            <TouchableOpacity
              style={[styles.option, { borderColor: "blue" }]}
              onPress={() => {
                onZoneTypeChange("internal");
                setModalVisible(false);
              }}
            >
              <FontAwesome name="circle" size={20} color="blue" />
              <Text style={styles.optionText}>Interne</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.option, { borderColor: "gold" }]}
              onPress={() => {
                onZoneTypeChange("shared");
                setModalVisible(false);
              }}
            >
              <FontAwesome name="circle" size={20} color="gold" />
              <Text style={styles.optionText}>Partagée</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.option, { borderColor: "red" }]}
              onPress={() => {
                onZoneTypeChange("forbidden");
                setModalVisible(false);
              }}
            >
              <FontAwesome name="circle" size={20} color="red" />
              <Text style={styles.optionText}>Interdite</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getColor(type: ZoneType) {
  switch (type) {
    case "internal":
      return "blue";
    case "shared":
      return "gold";
    case "forbidden":
      return "red";
    default:
      return "gray";
  }
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: [{ translateY: -30 }], // half the button height
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#eee",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  drawer: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 250,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderRadius: 10,
  },
  optionText: {
    marginLeft: 10,
    fontSize: 16,
  },
  closeText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
    fontSize: 16,
  },
});
