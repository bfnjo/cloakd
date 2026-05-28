import { StyleSheet, Text, View } from "react-native";

export default function BadgeWall() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Badges</Text>
      <View style={styles.body}>
        <Text style={styles.emoji}>🏅</Text>
        <Text style={styles.text}>Badge Wall</Text>
        <Text style={styles.subtext}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 24 },
  body: { flex: 1, justifyContent: "center", alignItems: "center" },
  emoji: { fontSize: 48, marginBottom: 16 },
  text: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  subtext: { color: "#888", fontSize: 14 },
});