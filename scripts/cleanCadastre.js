const fs = require("fs");
const path = require("path");

// Chemin vers le fichier cadastre.json
const cadastrePath = path.join(
  __dirname,
  "..",
  "app",
  "(tabs)",
  "cadastre.json"
);

console.log("🧹 Démarrage du nettoyage du fichier cadastre.json...");
console.log("📁 Fichier:", cadastrePath);

// Lire le fichier cadastre.json
const cadastreData = JSON.parse(fs.readFileSync(cadastrePath, "utf8"));

console.log("📊 Features originales:", cadastreData.features.length);

// Map pour tracker les parcelles uniques
const uniqueParcels = new Map();
const duplicates = [];

// Parcourir toutes les features
cadastreData.features.forEach((feature, index) => {
  const fullParcelId = feature.id || `parcelle_${index}`;
  const baseParcelId = fullParcelId.replace(/_\d+_\d+$/, "");

  if (uniqueParcels.has(baseParcelId)) {
    // C'est un doublon
    duplicates.push({
      fullId: fullParcelId,
      baseId: baseParcelId,
      index: index,
    });
  } else {
    // Première occurrence de cette parcelle
    uniqueParcels.set(baseParcelId, {
      feature: feature,
      fullId: fullParcelId,
      index: index,
    });
  }
});

console.log("🔍 Doublons trouvés:", duplicates.length);
console.log("✅ Parcelles uniques:", uniqueParcels.size);

// Créer un nouveau tableau avec seulement les features uniques
const cleanedFeatures = Array.from(uniqueParcels.values()).map(
  (item) => item.feature
);

// Créer le nouveau fichier nettoyé
const cleanedData = {
  ...cadastreData,
  features: cleanedFeatures,
};

// Sauvegarder une copie de l'original
const backupPath = cadastrePath.replace(".json", "_backup.json");
fs.writeFileSync(backupPath, JSON.stringify(cadastreData, null, 2));
console.log("💾 Sauvegarde créée:", backupPath);

// Écrire le fichier nettoyé
fs.writeFileSync(cadastrePath, JSON.stringify(cleanedData, null, 2));

console.log("✨ Nettoyage terminé !");
console.log("📉 Features supprimées:", duplicates.length);
console.log("📊 Features finales:", cleanedFeatures.length);
console.log(
  "💡 Ratio de compression:",
  Math.round((duplicates.length / cadastreData.features.length) * 100) + "%"
);

// Afficher quelques exemples de doublons supprimés
if (duplicates.length > 0) {
  console.log("\n🗑️ Exemples de doublons supprimés:");
  duplicates.slice(0, 5).forEach((dup) => {
    console.log(`   - ${dup.fullId} (base: ${dup.baseId})`);
  });
  if (duplicates.length > 5) {
    console.log(`   ... et ${duplicates.length - 5} autres`);
  }
}
