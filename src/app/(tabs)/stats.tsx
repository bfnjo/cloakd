import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ClothingIcon from "../../components/ClothingIcon";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  colour: string;
  brand: string;
  price: number;
  wear_count: number;
  image_url: string | null;
};

export default function Stats() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfitCount, setOutfitCount] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const ItemThumb = ({ item }: { item: ClothingItem }) => {
    if (item.image_url) {
      return <Image source={{ uri: item.image_url }} style={styles.itemPhoto} contentFit="contain" />;
    }
    return <ClothingIcon category={item.category} subcategory={item.subcategory || ""} colour={item.colour} size={44} />;
  };

  const fetchStats = async () => {
    const user = await new Promise<any>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => { unsubscribe(); resolve(u); });
    });
    if (!user) return;

    // Fetch wardrobe
    const { data: wardrobeData, error: wardrobeError } = await supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.uid);
    if (wardrobeError) Alert.alert("Error", wardrobeError.message);
    else setItems(wardrobeData || []);

    // Fetch outfit logs
    const { data: logsData, error: logsError } = await supabase
      .from("outfit_logs")
      .select("date")
      .eq("user_id", user.uid)
      .order("date", { ascending: true });
    if (logsError) Alert.alert("Error", logsError.message);
    else {
      setOutfitCount(logsData?.length || 0);
      setLongestStreak(calculateLongestStreak(logsData?.map((l: { date: string }) => l.date) || []));
    }

    setLoading(false);
  };

  const calculateLongestStreak = (dates: string[]) => {
    if (dates.length === 0) return 0;
    const unique = [...new Set(dates)].sort();
    let longest = 1;
    let current = 1;
    for (let i = 1; i < unique.length; i++) {
      const prev = new Date(unique[i - 1]);
      const curr = new Date(unique[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    return longest;
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const wornItems = items.filter(i => i.wear_count > 0 && i.price > 0);
  const bestValueItem = wornItems.length > 0
    ? wornItems.reduce((a, b) => (a.price / a.wear_count) < (b.price / b.wear_count) ? a : b)
    : null;
  const mostWornItem = items.length > 0
    ? items.reduce((a, b) => a.wear_count > b.wear_count ? a : b)
    : null;
  const totalValue = items.reduce((sum, i) => sum + (i.price || 0), 0);
  const avgCPW = wornItems.length > 0
    ? wornItems.reduce((sum, i) => sum + i.price / i.wear_count, 0) / wornItems.length
    : 0;

  if (loading) return (
    <View style={styles.container}>
      <Text style={{ color: "#888", textAlign: "center", marginTop: 100 }}>Loading...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/profile")}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Stats</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Overview */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Items owned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{outfitCount}</Text>
          <Text style={styles.statLabel}>Outfits logged</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🔥 {longestStreak}</Text>
          <Text style={styles.statLabel}>Longest streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${totalValue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Wardrobe value</Text>
        </View>
      </View>

      {/* Avg CPW */}
      <View style={styles.highlightCard}>
        <Text style={styles.highlightLabel}>Average cost-per-wear</Text>
        <Text style={styles.highlightValue}>
          {avgCPW > 0 ? `$${avgCPW.toFixed(2)}` : "Log more outfits to see this"}
        </Text>
      </View>

      {/* Best Value Item */}
      <Text style={styles.sectionTitle}>Best Value Item</Text>
      {bestValueItem ? (
        <View style={styles.itemCard}>
          <ItemThumb item={bestValueItem} />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{bestValueItem.name}</Text>
            <Text style={styles.itemDetail}>{bestValueItem.colour} · {bestValueItem.wear_count}× worn</Text>
          </View>
          <View style={styles.cpwBadge}>
            <Text style={styles.cpwBadgeText}>${(bestValueItem.price / bestValueItem.wear_count).toFixed(2)}/wear</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Add prices to your items to see this</Text>
        </View>
      )}

      {/* Most Worn Item */}
      <Text style={styles.sectionTitle}>Most Worn Item</Text>
      {mostWornItem && mostWornItem.wear_count > 0 ? (
        <View style={styles.itemCard}>
          <ItemThumb item={mostWornItem} />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{mostWornItem.name}</Text>
            <Text style={styles.itemDetail}>{mostWornItem.colour} · {mostWornItem.category}</Text>
          </View>
          <View style={styles.wearsBadge}>
            <Text style={styles.wearsBadgeText}>{mostWornItem.wear_count}× worn</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Log outfits to see your most worn item</Text>
        </View>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  backText: { color: "#7B7FE8", fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  statCard: { backgroundColor: "#111", borderRadius: 16, padding: 16, width: "48%", marginBottom: 12, borderWidth: 1, borderColor: "#222", alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#888", textAlign: "center" },
  highlightCard: { backgroundColor: "#1a1a2e", borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "#7B7FE833", alignItems: "center" },
  highlightLabel: { fontSize: 12, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  highlightValue: { fontSize: 28, fontWeight: "bold", color: "#7B7FE8" },
  itemCard: { backgroundColor: "#111", borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "#222", flexDirection: "row", alignItems: "center" },
  itemPhoto: { width: 44, height: 44, borderRadius: 8, marginRight: 16 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  itemDetail: { fontSize: 13, color: "#888" },
  cpwBadge: { backgroundColor: "#0a2a0a", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#00ff0033" },
  cpwBadgeText: { color: "#00cc44", fontSize: 13, fontWeight: "bold" },
  wearsBadge: { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#7B7FE833" },
  wearsBadgeText: { color: "#7B7FE8", fontSize: 13, fontWeight: "bold" },
  emptyCard: { backgroundColor: "#111", borderRadius: 16, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: "#222", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
});