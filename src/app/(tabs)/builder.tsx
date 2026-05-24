import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Builder() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Builder</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.text}>Outfit Builder</Text>
        <Text style={styles.subtext}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  backText: { color: "#7B7FE8", fontSize: 16 },
  body: { flex: 1, justifyContent: "center", alignItems: "center" },
  emoji: { fontSize: 48, marginBottom: 16 },
  text: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  subtext: { color: "#888", fontSize: 14 },
});