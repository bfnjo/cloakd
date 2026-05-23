import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "../firebaseConfig";

export default function Home() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName || "there");
      } else {
        router.replace("/");
      }
    });
    return unsubscribe;
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/profile")}>
          <Text style={styles.profileText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>{getGreeting()}, {userName.charAt(0).toUpperCase() + userName.slice(1)} 👋</Text>
      <Text style={styles.subtext}>What are you wearing today?</Text>

      {/* Today's Weather Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Weather</Text>
        <Text style={styles.weatherText}>☀️ 28°C · Singapore</Text>
        <Text style={styles.weatherSub}>Great day for a casual fit</Text>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/wardrobe")}>
          <Text style={styles.actionIcon}>👗</Text>
          <Text style={styles.actionLabel}>Wardrobe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>✨</Text>
          <Text style={styles.actionLabel}>Builder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🌐</Text>
          <Text style={styles.actionLabel}>Community</Text>
        </TouchableOpacity>
      </View>

      {/* Streak */}
      <View style={styles.streakCard}>
        <Text style={styles.streakText}>🔥 7 day streak</Text>
        <Text style={styles.streakSub}>Keep logging your outfits!</Text>
      </View>

      {/* Recent Outfits */}
      <Text style={styles.sectionTitle}>Recent Outfits</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No outfits logged yet.</Text>
        <Text style={styles.emptySubtext}>Start by building your first outfit!</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 48,
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 40,
  },
  profileButton: {
    backgroundColor: "#111",
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  profileText: {
    fontSize: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#222",
  },
  cardTitle: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  weatherText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
  },
  weatherSub: {
    fontSize: 14,
    color: "#888",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    width: "23%",
    borderWidth: 1,
    borderColor: "#222",
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
  },
  streakCard: {
    backgroundColor: "#1a0f00",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#ff6b0033",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  streakText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff6b00",
  },
  streakSub: {
    fontSize: 13,
    color: "#888",
  },
  emptyCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#888",
  },
});