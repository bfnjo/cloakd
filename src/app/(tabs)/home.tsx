import * as Location from "expo-location";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ClothingIcon from "../../components/ClothingIcon";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";

type RecentOutfit = {
  id: string;
  date: string;
  items: { id: string; name: string; category: string; subcategory: string; colour: string }[];
};

export default function Home() {
  const [userName, setUserName] = useState("");
  const [weather, setWeather] = useState({ temp: "--", description: "Loading...", emoji: "🌤️", city: "..." });
  const [recentOutfits, setRecentOutfits] = useState<RecentOutfit[]>([]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName || "there");
        fetchRecentOutfits(user.uid);
      } else {
        router.replace("/(auth)");
      }
    });
    return unsubscribe;
  }, []);

  const fetchRecentOutfits = async (uid: string) => {
    const { data, error } = await supabase
      .from("outfit_logs")
      .select(`*, outfit_log_items(clothing_item_id, clothing_items(*))`)
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(3);
    if (error) { console.log("Error fetching outfits:", error.message); return; }
    const formatted = (data || []).map((log: any) => ({
      id: log.id,
      date: log.date,
      items: log.outfit_log_items.map((oli: any) => oli.clothing_items),
    }));
    setRecentOutfits(formatted);
  };

  useEffect(() => {
    const fetchWeather = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setWeather({ temp: "--", description: "Location unavailable", emoji: "🌤️", city: "Unknown" });
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const city = geocode[0]?.city || geocode[0]?.region || "Unknown";

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`
      );
      const data = await response.json();
      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weathercode;

      const getWeatherInfo = (code: number) => {
        if (code === 0) return { description: "Clear skies", emoji: "☀️" };
        if (code <= 3) return { description: "Partly cloudy", emoji: "⛅" };
        if (code <= 48) return { description: "Foggy", emoji: "🌫️" };
        if (code <= 67) return { description: "Rainy", emoji: "🌧️" };
        if (code <= 77) return { description: "Snowy", emoji: "❄️" };
        if (code <= 82) return { description: "Showers", emoji: "🌦️" };
        return { description: "Stormy", emoji: "⛈️" };
      };

      const { description, emoji } = getWeatherInfo(code);
      setWeather({ temp: temp.toString(), description, emoji, city });
    };

    fetchWeather();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getWeatherOutfitTip = (description: string) => {
    if (description === "Clear skies") return "Great day for a casual fit";
    if (description === "Partly cloudy") return "Light layers would work well";
    if (description === "Rainy" || description === "Showers") return "Don't forget a jacket!";
    if (description === "Stormy") return "Stay dry — layer up!";
    if (description === "Foggy") return "A light layer would be perfect";
    return "Dress for the weather!";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric"
    });
  };

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("../../../assets/images/cloakd_images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/(tabs)/profile")}>
          <Text style={styles.profileText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>{getGreeting()}, {userName.charAt(0).toUpperCase() + userName.slice(1)} 👋</Text>
      <Text style={styles.subtext}>What are you wearing today?</Text>

      {/* Today's Weather Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Weather</Text>
        <Text style={styles.weatherText}>{weather.emoji} {weather.temp}°C · {weather.city}</Text>
        <Text style={styles.weatherSub}>{getWeatherOutfitTip(weather.description)}</Text>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/wardrobe")}>
          <Text style={styles.actionIcon}>👗</Text>
          <Text style={styles.actionLabel}>Wardrobe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/builder")}>
          <Text style={styles.actionIcon}>✨</Text>
          <Text style={styles.actionLabel}>Builder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/calendar")}>
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/community")}>
          <Text style={styles.actionIcon}>🌐</Text>
          <Text style={styles.actionLabel}>Community</Text>
        </TouchableOpacity>
      </View>

      {/* Streak */}
      <View style={styles.streakCard}>
        <Text style={styles.streakText}>🔥 0 day streak</Text>
        <Text style={styles.streakSub}>Keep logging your outfits!</Text>
      </View>

      {/* Recent Outfits */}
      <Text style={styles.sectionTitle}>Recent Outfits</Text>
      {recentOutfits.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No outfits logged yet.</Text>
          <Text style={styles.emptySubtext}>Start by building your first outfit!</Text>
        </View>
      ) : (
        recentOutfits.map(outfit => (
          <View key={outfit.id} style={styles.outfitCard}>
            <Text style={styles.outfitDate}>{formatDate(outfit.date)}</Text>
            <View style={styles.outfitItems}>
              {outfit.items.map(item => (
                <View key={item.id} style={styles.outfitItem}>
                  <ClothingIcon category={item.category} subcategory={item.subcategory || ""} colour={item.colour} size={22} />
                  <Text style={styles.outfitItemName}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}

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
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#222",
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "center",
    fontWeight: "bold",
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
  outfitCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  outfitDate: {
    fontSize: 13,
    color: "#7B7FE8",
    fontWeight: "bold",
    marginBottom: 12,
  },
  outfitItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  outfitItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e2e3a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  outfitItemEmoji: {
    fontSize: 16,
  },
  outfitItemName: {
    fontSize: 12,
    color: "#fff",
  },
});