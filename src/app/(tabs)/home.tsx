import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ClothingIcon from "../../components/ClothingIcon";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";

type RecentOutfit = {
  id: string;
  date: string;
  items: { id: string; name: string; category: string; subcategory: string; colour: string; image_url?: string | null }[];
};

export default function Home() {
  const [userName, setUserName] = useState("");
  const [weather, setWeather] = useState({ temp: "--", description: "Loading...", emoji: "🌤️", city: "..." });
  const [recentOutfits, setRecentOutfits] = useState<RecentOutfit[]>([]);
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [streak, setStreak] = useState(0);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserName(user.displayName || "there");
        fetchRecentOutfits(user.uid);
        fetchStreak(user.uid);
        const { data: settingsData } = await supabase
          .from("user_settings")
          .select("temperature_unit")
          .eq("firebase_uid", user.uid)
          .single();
        const unit: "C" | "F" = settingsData?.temperature_unit ?? "C";
        setTempUnit(unit);
        fetchWeather(unit);
      } else {
        router.replace("/(auth)");
      }
    });
    return unsubscribe;
  }, []);

  const fetchStreak = async (uid: string) => {
    const { data } = await supabase
      .from("outfit_logs")
      .select("date")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(400);
    if (!data || data.length === 0) { setStreak(0); return; }

    const dates = [...new Set(data.map((r: any) => r.date as string))].sort().reverse();

    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = toDateStr(new Date());
    const yesterday = toDateStr(new Date(Date.now() - 86400000));

    if (dates[0] !== today && dates[0] !== yesterday) { setStreak(0); return; }

    let count = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + "T12:00:00");
      const curr = new Date(dates[i] + "T12:00:00");
      const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) { count++; } else { break; }
    }

    setStreak(count >= 2 ? count : 0);
  };

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

  useFocusEffect(useCallback(() => {
    const user = auth.currentUser;
    if (user) {
      fetchStreak(user.uid);
      fetchRecentOutfits(user.uid);
    }
  }, []));

  const fetchWeather = async (unit: "C" | "F" = "C") => {
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
    const tempC = Math.round(data.current.temperature_2m);
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
    const displayTemp = unit === "F" ? Math.round(tempC * 9 / 5 + 32) : tempC;
    setWeather({ temp: displayTemp.toString(), description, emoji, city });
  };

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
        <Text style={styles.weatherText}>{weather.emoji} {weather.temp}°{tempUnit} · {weather.city}</Text>
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
        <Text style={styles.streakText}>
          {streak >= 2 ? `🔥 ${streak} day streak` : "🔥 No streak yet"}
        </Text>
        <Text style={styles.streakSub}>
          {streak >= 2 ? "Keep it up!" : "Log 2 days in a row to start one!"}
        </Text>
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
          <TouchableOpacity
            key={outfit.id}
            onPress={() => router.push(`/(tabs)/calendar?date=${outfit.date}`)}
            activeOpacity={0.7}
          >
            <View style={styles.outfitCard}>
              <Text style={styles.outfitDate}>{formatDate(outfit.date)}</Text>
              <View style={styles.outfitItems}>
                {outfit.items.map(item => (
                  <View key={item.id} style={styles.outfitItem}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={styles.outfitItemPhoto} resizeMode="contain" />
                      : <ClothingIcon category={item.category} subcategory={item.subcategory || ""} colour={item.colour} size={22} />
                    }
                    <Text style={styles.outfitItemName}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
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
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
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
  outfitItemPhoto: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  outfitItemName: {
    fontSize: 12,
    color: "#fff",
  },
});