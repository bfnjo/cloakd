import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Circle, Svg } from "react-native-svg";
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

const RING_RADIUS = 80;
const RING_STROKE = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getScoreTier(score: number): { colour: string; track: string; tooltip: string } {
  if (score <= 50) return {
    colour: "#ff4444",
    track: "#3a0a0a",
    tooltip: "You have many unworn clothes, try giving them a chance!",
  };
  if (score <= 75) return {
    colour: "#ffaa00",
    track: "#2a1a00",
    tooltip: "You're making use of your wardrobe, but there's room to improve!",
  };
  if (score <= 90) return {
    colour: "#00cc44",
    track: "#0a2a0a",
    tooltip: "Great work! Most of your wardrobe is being put to good use.",
  };
  return {
    colour: "#7B7FE8",
    track: "#1a1a2e",
    tooltip: "Outstanding! Your wardrobe utilisation is exceptional!",
  };
}

function WardrobeScoreRing({ score }: { score: number }) {
  const tier = getScoreTier(score);
  const progress = score / 100;
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  const size = (RING_RADIUS + RING_STROKE) * 2;

  return (
    <View style={styles.scoreSection}>
      <View style={styles.ringWrapper}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={RING_RADIUS}
            stroke={tier.track}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={RING_RADIUS}
            stroke={tier.colour}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringScore, { color: tier.colour }]}>{score}</Text>
          <Text style={styles.ringOutOf}>/100</Text>
        </View>
      </View>
      <Text style={[styles.scoreTooltip, { color: tier.colour }]}>{tier.tooltip}</Text>
    </View>
  );
}

export default function Stats() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfitCount, setOutfitCount] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [utilisationScore, setUtilisationScore] = useState(0);
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

    const [
      { data: wardrobeData, error: wardrobeError },
      { data: logsData, error: logsError },
      { data: logsWithItems, error: logsItemsError },
    ] = await Promise.all([
      supabase.from("clothing_items").select("*").eq("user_id", user.uid),
      supabase.from("outfit_logs").select("date").eq("user_id", user.uid).order("date", { ascending: true }),
      supabase.from("outfit_logs").select("date, outfit_log_items(clothing_item_id)").eq("user_id", user.uid).order("date", { ascending: false }),
    ]);

    if (wardrobeError) { Alert.alert("Error", wardrobeError.message); return; }
    if (logsError) { Alert.alert("Error", logsError.message); return; }

    const wardrobe: ClothingItem[] = wardrobeData || [];
    setItems(wardrobe);
    setOutfitCount(logsData?.length || 0);
    setLongestStreak(calculateLongestStreak(logsData?.map((l: { date: string }) => l.date) || []));

    // Build last-worn map (same logic as wardrobe page)
    const lastWornMap: Record<string, string> = {};
    (logsWithItems || []).forEach((log: any) => {
      (log.outfit_log_items || []).forEach((oli: any) => {
        if (!lastWornMap[oli.clothing_item_id]) lastWornMap[oli.clothing_item_id] = log.date;
      });
    });

    // Compute utilisation score: % of wardrobe that is NOT forgotten, rounded up
    if (wardrobe.length > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const notForgotten = wardrobe.filter(item => {
        const lastWorn = lastWornMap[item.id];
        if (!lastWorn) return false;
        return new Date(lastWorn + "T00:00:00") >= thirtyDaysAgo;
      });
      setUtilisationScore(Math.min(100, Math.ceil((notForgotten.length / wardrobe.length) * 100)));
    } else {
      setUtilisationScore(0);
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

      {/* Wardrobe Utilisation Score */}
      <Text style={styles.sectionTitle}>Wardrobe Utilisation Score</Text>
      <WardrobeScoreRing score={utilisationScore} />

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
          <View style={styles.itemIconWrapper}><ItemThumb item={bestValueItem} /></View>
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
          <View style={styles.itemIconWrapper}><ItemThumb item={mostWornItem} /></View>
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
  itemIconWrapper: { backgroundColor: "#2e2e3a", borderRadius: 10, width: 56, height: 56, alignItems: "center", justifyContent: "center", marginRight: 16 },
  itemPhoto: { width: 48, height: 48, borderRadius: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  itemDetail: { fontSize: 13, color: "#888" },
  cpwBadge: { backgroundColor: "#0a2a0a", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#00ff0033" },
  cpwBadgeText: { color: "#00cc44", fontSize: 13, fontWeight: "bold" },
  wearsBadge: { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#7B7FE833" },
  wearsBadgeText: { color: "#7B7FE8", fontSize: 13, fontWeight: "bold" },
  emptyCard: { backgroundColor: "#111", borderRadius: 16, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: "#222", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
  scoreSection: { alignItems: "center", marginBottom: 24 },
  ringWrapper: { width: (RING_RADIUS + RING_STROKE) * 2, height: (RING_RADIUS + RING_STROKE) * 2, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  ringCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  ringScore: { fontSize: 40, fontWeight: "bold", lineHeight: 44 },
  ringOutOf: { fontSize: 13, color: "#555", marginTop: 2 },
  scoreTooltip: { fontSize: 13, textAlign: "center", paddingHorizontal: 24, lineHeight: 18 },
});