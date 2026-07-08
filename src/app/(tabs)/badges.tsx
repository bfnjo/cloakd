import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";

type ClothingItem = {
  id: string;
  price: number;
  wear_count: number;
  created_at: string;
};

type Badge = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  conditionMet: boolean;
  progress: number;
  progressText: string;
};

export default function BadgeWall() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfitCount, setOutfitCount] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [maxPostLikes, setMaxPostLikes] = useState(0);
  const [weekColourCount, setWeekColourCount] = useState(0);
  const [weekBrandCount, setWeekBrandCount] = useState(0);
  const [hasVintageLover, setHasVintageLover] = useState(false);
  const [firstOutfitPostCount, setFirstOutfitPostCount] = useState(0);
  const [hasFanFavourite, setHasFanFavourite] = useState(false);
  const [hasEarlyAdopter, setHasEarlyAdopter] = useState(false);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingBadge, setSharingBadge] = useState<Badge | null>(null);
  const [caption, setCaption] = useState("");
  const [sharing, setSharing] = useState(false);

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

  const fetchData = async () => {
    const user = await new Promise<any>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => { unsubscribe(); resolve(u); });
    });
    if (!user) return;

    const { data: wardrobeData } = await supabase
      .from("clothing_items")
      .select("id, price, wear_count, created_at")
      .eq("user_id", user.uid);
    const currentItems: ClothingItem[] = (wardrobeData || []) as ClothingItem[];
    setItems(currentItems);

    const { data: logsData } = await supabase
      .from("outfit_logs")
      .select("date")
      .eq("user_id", user.uid)
      .order("date", { ascending: true });
    const dates = logsData?.map((l: { date: string }) => l.date) || [];
    const currentOutfitCount = dates.length;
    const currentStreak = calculateLongestStreak(dates);
    setOutfitCount(currentOutfitCount);
    setLongestStreak(currentStreak);

    // Early Adopter: logged an outfit within first week of joining
    const joinDate = new Date(user.metadata.creationTime);
    const joinPlusWeek = new Date(joinDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const currentHasEarlyAdopter = dates.some((d: string) => new Date(d + "T00:00:00") <= joinPlusWeek);
    setHasEarlyAdopter(currentHasEarlyAdopter);

    // Rainbow Dresser + Brand Hopper: unique colours/brands logged in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const { data: recentLogs } = await supabase
      .from("outfit_logs")
      .select("outfit_log_items(clothing_items(colour, brand))")
      .eq("user_id", user.uid)
      .gte("date", sevenDaysAgoStr);
    const recentColours = new Set<string>();
    const recentBrands = new Set<string>();
    (recentLogs || []).forEach((log: any) => {
      (log.outfit_log_items || []).forEach((oli: any) => {
        if (oli.clothing_items?.colour) recentColours.add(oli.clothing_items.colour.toLowerCase().trim());
        if (oli.clothing_items?.brand?.trim()) recentBrands.add(oli.clothing_items.brand.toLowerCase().trim());
      });
    });
    setWeekColourCount(recentColours.size);
    setWeekBrandCount(recentBrands.size);

    // Vintage Lover: logged an item that's been in wardrobe 1+ year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oldItemIds = currentItems
      .filter((i) => new Date(i.created_at) < oneYearAgo)
      .map((i) => i.id);
    let currentHasVintageLover = false;
    if (oldItemIds.length > 0) {
      const { data: vintageLog } = await supabase
        .from("outfit_log_items")
        .select("clothing_item_id")
        .in("clothing_item_id", oldItemIds)
        .limit(1);
      currentHasVintageLover = (vintageLog?.length ?? 0) > 0;
    }
    setHasVintageLover(currentHasVintageLover);

    const { data: outfitPosts } = await supabase
      .from("community_posts")
      .select("id")
      .eq("user_id", user.uid)
      .not("outfit_log_id", "is", null);
    setFirstOutfitPostCount(outfitPosts?.length ?? 0);
    let currentMaxLikes = 0;
    let currentHasFanFavourite = false;
    if (outfitPosts && outfitPosts.length > 0) {
      const postIds = outfitPosts.map((p: { id: string }) => p.id);
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);
      const likesByPost: Record<string, number> = {};
      const likesByLiker: Record<string, number> = {};
      (likesData || []).forEach((l: { post_id: string; user_id: string }) => {
        likesByPost[l.post_id] = (likesByPost[l.post_id] || 0) + 1;
        likesByLiker[l.user_id] = (likesByLiker[l.user_id] || 0) + 1;
      });
      currentMaxLikes = Object.values(likesByPost).length > 0 ? Math.max(...Object.values(likesByPost)) : 0;
      currentHasFanFavourite = Object.values(likesByLiker).some((count) => count >= 5);
    }
    setMaxPostLikes(currentMaxLikes);
    setHasFanFavourite(currentHasFanFavourite);

    const { data: badgeRows } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", user.uid);
    const earnedSet = new Set((badgeRows || []).map((b: { badge_id: string }) => b.badge_id));

    const wornItems = currentItems.filter((i) => i.wear_count > 0 && i.price > 0);
    const itemCPWs = wornItems.map((i) => i.price / i.wear_count);
    const bestCPW = itemCPWs.length > 0 ? Math.min(...itemCPWs) : null;
    const maxWearCount = currentItems.length > 0 ? Math.max(...currentItems.map((i) => i.wear_count)) : 0;
    const currentHasInvestmentPiece = currentItems.some((i) => i.price >= 200);

    const conditions: { id: string; met: boolean }[] = [
      { id: "signup", met: true },
      { id: "early-adopter", met: currentHasEarlyAdopter },
      { id: "streak-7", met: currentStreak >= 7 },
      { id: "streak-30", met: currentStreak >= 30 },
      { id: "streak-100", met: currentStreak >= 100 },
      { id: "cpw-5", met: bestCPW !== null && bestCPW < 5 },
      { id: "cpw-1", met: bestCPW !== null && bestCPW < 1 },
      { id: "items-10", met: currentItems.length >= 10 },
      { id: "items-25", met: currentItems.length >= 25 },
      { id: "items-50", met: currentItems.length >= 50 },
      { id: "outfits-1", met: currentOutfitCount >= 1 },
      { id: "outfits-10", met: currentOutfitCount >= 10 },
      { id: "outfits-100", met: currentOutfitCount >= 100 },
      { id: "likes-10", met: currentMaxLikes >= 10 },
      { id: "likes-40", met: currentMaxLikes >= 40 },
      { id: "likes-100", met: currentMaxLikes >= 100 },
      { id: "rainbow-dresser", met: recentColours.size >= 5 },
      { id: "brand-hopper", met: recentBrands.size >= 5 },
      { id: "old-faithful", met: maxWearCount >= 10 },
      { id: "wardrobe-warrior", met: maxWearCount >= 50 },
      { id: "vintage-lover", met: currentHasVintageLover },
      { id: "first-post", met: (outfitPosts?.length ?? 0) >= 1 },
      { id: "conversation-starter", met: currentMaxLikes >= 3 },
      { id: "fan-favourite", met: currentHasFanFavourite },
      { id: "investment-piece", met: currentHasInvestmentPiece },
    ];

    const newlyEarned = conditions.filter((c) => c.met && !earnedSet.has(c.id));
    if (newlyEarned.length > 0) {
      await supabase.from("user_badges").upsert(
        newlyEarned.map((c) => ({ user_id: user.uid, badge_id: c.id }))
      );
      newlyEarned.forEach((c) => earnedSet.add(c.id));
    }

    setEarnedIds(earnedSet);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const wornItems = items.filter((i) => i.wear_count > 0 && i.price > 0);
  const itemCPWs = wornItems.map((i) => i.price / i.wear_count);
  const bestCPW = itemCPWs.length > 0 ? Math.min(...itemCPWs) : null;
  const maxWearCount = items.length > 0 ? Math.max(...items.map((i) => i.wear_count)) : 0;
  const hasInvestmentPiece = items.some((i) => i.price >= 200);

  const clamp = (n: number) => Math.min(1, Math.max(0, n));

  const buildBadge = (
    id: string,
    emoji: string,
    title: string,
    description: string,
    progress: number,
    progressText: string
  ): Badge => ({
    id, emoji, title, description,
    conditionMet: earnedIds.has(id),
    progress: earnedIds.has(id) ? 1 : progress,
    progressText: earnedIds.has(id) ? "Unlocked" : progressText,
  });

  const badgeGroups: { title: string; badges: Badge[] }[] = [
    {
      title: "Getting Started",
      badges: [
        buildBadge("signup", "🎉", "Welcome to Cloakd", "Create your account", 1, "Unlocked"),
        buildBadge("early-adopter", "⚡", "Early Adopter", "Log an outfit within your first week",
          hasEarlyAdopter ? 1 : 0, hasEarlyAdopter ? "Unlocked" : "Log an outfit this week"),
        buildBadge("first-post", "📣", "First Post", "Share your first outfit to the community",
          clamp(firstOutfitPostCount), `${Math.min(firstOutfitPostCount, 1)}/1 post`),
      ],
    },
    {
      title: "Streaks",
      badges: [
        buildBadge("streak-7", "🔥", "7-Day Streak", "Log outfits 7 days in a row",
          clamp(longestStreak / 7), `${Math.min(longestStreak, 7)}/7 days`),
        buildBadge("streak-30", "🥈", "30-Day Streak", "Log outfits 30 days in a row",
          clamp(longestStreak / 30), `${Math.min(longestStreak, 30)}/30 days`),
        buildBadge("streak-100", "🥇", "100-Day Streak", "Log outfits 100 days in a row",
          clamp(longestStreak / 100), `${Math.min(longestStreak, 100)}/100 days`),
      ],
    },
    {
      title: "Cost-Per-Wear",
      badges: [
        buildBadge("cpw-5", "💰", "Smart Spender", "Get one item's cost-per-wear under $5",
          bestCPW !== null ? clamp(5 / Math.max(bestCPW, 5)) : 0,
          bestCPW !== null ? `Best: $${bestCPW.toFixed(2)}/wear` : "Log outfits to start"),
        buildBadge("cpw-1", "💎", "Value Master", "Get one item's cost-per-wear under $1",
          bestCPW !== null ? clamp(1 / Math.max(bestCPW, 1)) : 0,
          bestCPW !== null ? `Best: $${bestCPW.toFixed(2)}/wear` : "Log outfits to start"),
      ],
    },
    {
      title: "Wardrobe Size",
      badges: [
        buildBadge("items-10", "👕", "Closet Starter", "Add 10 items to your wardrobe",
          clamp(items.length / 10), `${Math.min(items.length, 10)}/10 items`),
        buildBadge("items-25", "🧥", "Wardrobe Builder", "Add 25 items to your wardrobe",
          clamp(items.length / 25), `${Math.min(items.length, 25)}/25 items`),
        buildBadge("items-50", "👑", "Collection Complete", "Add 50 items to your wardrobe",
          clamp(items.length / 50), `${Math.min(items.length, 50)}/50 items`),
      ],
    },
    {
      title: "Outfits Logged",
      badges: [
        buildBadge("outfits-1", "📅", "First Look", "Log your first outfit",
          clamp(outfitCount / 1), `${Math.min(outfitCount, 1)}/1 outfit`),
        buildBadge("outfits-10", "📆", "Regular", "Log 10 outfits",
          clamp(outfitCount / 10), `${Math.min(outfitCount, 10)}/10 outfits`),
        buildBadge("outfits-100", "🗓️", "Century Club", "Log 100 outfits",
          clamp(outfitCount / 100), `${Math.min(outfitCount, 100)}/100 outfits`),
      ],
    },
    {
      title: "Community",
      badges: [
        buildBadge("conversation-starter", "💬", "Conversation Starter", "Get 3 likes on a post with a logged outfit",
          clamp(maxPostLikes / 3), `${Math.min(maxPostLikes, 3)}/3 likes`),
        buildBadge("likes-10", "🌟", "Getting There", "Get 10 likes on a post with a logged outfit",
          clamp(maxPostLikes / 10), `${Math.min(maxPostLikes, 10)}/10 likes`),
        buildBadge("likes-40", "✨", "Fashionista", "Get 40 likes on a post with a logged outfit",
          clamp(maxPostLikes / 40), `${Math.min(maxPostLikes, 40)}/40 likes`),
        buildBadge("likes-100", "🖼️", "Pinterest Wall", "Get 100 likes on a post with a logged outfit",
          clamp(maxPostLikes / 100), `${Math.min(maxPostLikes, 100)}/100 likes`),
        buildBadge("fan-favourite", "🫶", "Fan Favourite", "Have the same person like 5 of your posts",
          hasFanFavourite ? 1 : 0, hasFanFavourite ? "Unlocked" : "Keep posting!"),
      ],
    },
    {
      title: "Style Diversity",
      badges: [
        buildBadge("rainbow-dresser", "🌈", "Rainbow Dresser", "Wear 5 different colours in one week",
          clamp(weekColourCount / 5), `${Math.min(weekColourCount, 5)}/5 colours`),
        buildBadge("brand-hopper", "🛍️", "Brand Hopper", "Wear 5 different brands in one week",
          clamp(weekBrandCount / 5), `${Math.min(weekBrandCount, 5)}/5 brands`),
      ],
    },
    {
      title: "Outfit Recycler",
      badges: [
        buildBadge("old-faithful", "♻️", "Old Faithful", "Wear the same item 10 times",
          clamp(maxWearCount / 10), `${Math.min(maxWearCount, 10)}/10 wears`),
        buildBadge("wardrobe-warrior", "⚔️", "Wardrobe Warrior", "Wear the same item 50 times",
          clamp(maxWearCount / 50), `${Math.min(maxWearCount, 50)}/50 wears`),
        buildBadge("vintage-lover", "🕰️", "Vintage Lover", "Log an item that's been in your wardrobe for 1+ year",
          hasVintageLover ? 1 : 0, hasVintageLover ? "Unlocked" : "Keep wearing old favourites"),
      ],
    },
    {
      title: "Wardrobe Health",
      badges: [
        buildBadge("investment-piece", "💼", "Investment Piece", "Add an item worth over $200",
          hasInvestmentPiece ? 1 : 0, hasInvestmentPiece ? "Unlocked" : "Add a luxury item"),
      ],
    },
  ];

  const totalBadges = badgeGroups.reduce((sum, g) => sum + g.badges.length, 0);
  const unlockedBadges = badgeGroups.reduce(
    (sum, g) => sum + g.badges.filter((b) => b.conditionMet).length,
    0
  );

  const openShareModal = (badge: Badge) => {
    if (!badge.conditionMet) return;
    setSharingBadge(badge);
    setCaption(`Just unlocked ${badge.title}! ${badge.emoji}`);
    setShareModalVisible(true);
  };

  const handleShareBadge = async () => {
    if (!sharingBadge) return;
    setSharing(true);
    const user = await new Promise<any>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => { unsubscribe(); resolve(u); });
    });
    if (!user) { setSharing(false); return; }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("username")
      .eq("firebase_uid", user.uid)
      .single();

    const { error } = await supabase.from("community_posts").insert({
      user_id: user.uid,
      username: settings?.username || "Anonymous",
      post_type: "badge",
      badge_id: sharingBadge.id,
      badge_title: sharingBadge.title,
      badge_emoji: sharingBadge.emoji,
      caption: caption.trim(),
    });

    setSharing(false);
    if (error) {
      if (Platform.OS === "web") window.alert("Failed to share: " + error.message);
      else Alert.alert("Error", error.message);
      return;
    }

    setShareModalVisible(false);
    setSharingBadge(null);
    setCaption("");
    router.push("/(tabs)/community");
  };

  if (loading) return (
    <View style={styles.container}>
      <Text style={{ color: "#888", textAlign: "center", marginTop: 100 }}>Loading...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.backText} onPress={() => router.back()}>← Back</Text>
        <Text style={styles.title}>Badges</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.highlightCard}>
        <Text style={styles.highlightLabel}>Badges Earned</Text>
        <Text style={styles.highlightValue}>{unlockedBadges}/{totalBadges}</Text>
      </View>

      {badgeGroups.map((group) => (
        <View key={group.title}>
          <Text style={styles.sectionTitle}>{group.title}</Text>
          <View style={styles.badgeGrid}>
            {group.badges.map((badge) => (
              <TouchableOpacity
                key={badge.id}
                activeOpacity={badge.conditionMet ? 0.7 : 1}
                onPress={() => openShareModal(badge)}
                style={[styles.badgeCard, badge.conditionMet && styles.badgeCardUnlocked]}
              >
                <Text style={[styles.badgeEmoji, !badge.conditionMet && styles.badgeEmojiLocked]}>
                  {badge.emoji}
                </Text>
                <Text style={styles.badgeTitle}>{badge.title}</Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${badge.progress * 100}%` },
                      badge.conditionMet && styles.progressFillUnlocked,
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, badge.conditionMet && styles.progressTextUnlocked]}>
                  {badge.progressText}
                </Text>
                {badge.conditionMet && (
                  <Text style={styles.shareHint}>Tap to share →</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>{sharingBadge?.emoji}</Text>
            <Text style={styles.modalTitle}>{sharingBadge?.title}</Text>
            <Text style={styles.modalSubtitle}>Share this achievement with the community</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor="#666"
              value={caption}
              onChangeText={setCaption}
              multiline
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => { setShareModalVisible(false); setSharingBadge(null); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalShareButton}
                onPress={handleShareBadge}
                disabled={sharing}
              >
                <Text style={styles.modalShareText}>{sharing ? "Sharing..." : "Share"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 24, paddingTop: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  backText: { color: "#7B7FE8", fontSize: 16 },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  highlightCard: { backgroundColor: "#1a1a2e", borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "#7B7FE833", alignItems: "center" },
  highlightLabel: { fontSize: 12, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  highlightValue: { fontSize: 28, fontWeight: "bold", color: "#7B7FE8" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 12, marginTop: 8 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  badgeCard: { backgroundColor: "#111", borderRadius: 16, padding: 16, width: "48%", marginBottom: 12, borderWidth: 1, borderColor: "#222", alignItems: "center", opacity: 0.5 },
  badgeCardUnlocked: { opacity: 1, borderColor: "#7B7FE855" },
  badgeEmoji: { fontSize: 36, marginBottom: 8 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeTitle: { fontSize: 13, fontWeight: "bold", color: "#fff", marginBottom: 4, textAlign: "center" },
  badgeDescription: { fontSize: 11, color: "#888", textAlign: "center", marginBottom: 10 },
  progressTrack: { width: "100%", height: 6, backgroundColor: "#222", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", backgroundColor: "#555", borderRadius: 3 },
  progressFillUnlocked: { backgroundColor: "#7B7FE8" },
  progressText: { fontSize: 10, color: "#888" },
  progressTextUnlocked: { color: "#7B7FE8", fontWeight: "bold" },
  shareHint: { fontSize: 10, color: "#7B7FE8", marginTop: 6, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "#000000cc", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: "#111", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: "#222", alignItems: "center" },
  modalEmoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 4, textAlign: "center" },
  modalSubtitle: { fontSize: 13, color: "#888", marginBottom: 16, textAlign: "center" },
  captionInput: { backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "#333", padding: 12, color: "#fff", width: "100%", minHeight: 60, textAlignVertical: "top", marginBottom: 16 },
  modalButtonRow: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancelButton: { flex: 1, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", padding: 14, borderRadius: 12, alignItems: "center" },
  modalCancelText: { color: "#888", fontWeight: "bold" },
  modalShareButton: { flex: 1, backgroundColor: "#7B7FE8", padding: 14, borderRadius: 12, alignItems: "center" },
  modalShareText: { color: "#000", fontWeight: "bold" },
});