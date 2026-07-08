import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, Image,
} from "react-native";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";
import { BADGE_IMAGES } from "../../utils/badgeImages";

type ClothingItem = {
  id: string;
  price: number;
  wear_count: number;
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
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
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
      .select("id, price, wear_count")
      .eq("user_id", user.uid);
    const currentItems = wardrobeData || [];
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

    const creationTime = user.metadata?.creationTime;
    const currentAccountAgeDays = creationTime
      ? Math.floor((Date.now() - new Date(creationTime).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    setAccountAgeDays(currentAccountAgeDays);

    const { data: myPosts } = await supabase
      .from("community_posts")
      .select("id")
      .eq("user_id", user.uid);
    const myPostIds = (myPosts || []).map((p: { id: string }) => p.id);
    let currentTotalLikes = 0;
    if (myPostIds.length > 0) {
      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .in("post_id", myPostIds);
      currentTotalLikes = count || 0;
    }
    setTotalLikes(currentTotalLikes);

    const { data: badgeRows } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", user.uid);
    const earnedSet = new Set((badgeRows || []).map((b: { badge_id: string }) => b.badge_id));

    const wornItems = currentItems.filter((i) => i.wear_count > 0 && i.price > 0);
    const itemCPWs = wornItems.map((i) => i.price / i.wear_count);
    const bestCPW = itemCPWs.length > 0 ? Math.min(...itemCPWs) : null;

    const conditions: { id: string; met: boolean }[] = [
      { id: "signup", met: true },
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
      { id: "anniversary-1", met: currentAccountAgeDays >= 365 },
      { id: "anniversary-5", met: currentAccountAgeDays >= 365 * 5 },
      { id: "anniversary-10", met: currentAccountAgeDays >= 365 * 10 },
      { id: "likes-1", met: currentTotalLikes >= 1 },
      { id: "likes-10", met: currentTotalLikes >= 10 },
      { id: "likes-100", met: currentTotalLikes >= 100 },
      { id: "likes-1000", met: currentTotalLikes >= 1000 },
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
        buildBadge("signup", "🎉", "Welcome to Cloakd", "Every great wardrobe starts with one login.", 1, "Unlocked"),
      ],
    },
    {
      title: "Streaks",
      badges: [
        buildBadge("streak-7", "🔥", "Warming Up", "7 days straight! Your closet is starting to heat up!",
          clamp(longestStreak / 7), `${Math.min(longestStreak, 7)}/7 days`),
        buildBadge("streak-30", "🥈", "In Rotation", "30 days of building fire outfits. Impressive!",
          clamp(longestStreak / 30), `${Math.min(longestStreak, 30)}/30 days`),
        buildBadge("streak-100", "🥇", "Unkillable Habit", "100 days. At this point it's not just a streak, it's a part of your daily life.",
          clamp(longestStreak / 100), `${Math.min(longestStreak, 100)}/100 days`),
      ],
    },
    {
      title: "Cost-Per-Wear",
      badges: [
        buildBadge("cpw-5", "💰", "Getting Your Money's Worth", "One item finally earned its keep! Under $5 a wear.",
          bestCPW !== null ? clamp(5 / Math.max(bestCPW, 5)) : 0,
          bestCPW !== null ? `Best: $${bestCPW.toFixed(2)}/wear` : "Log outfits to start"),
        buildBadge("cpw-1", "💎", "Basically Free", "Under a dollar a wear. That piece of clothing has pretty much paid for itself!",
          bestCPW !== null ? clamp(1 / Math.max(bestCPW, 1)) : 0,
          bestCPW !== null ? `Best: $${bestCPW.toFixed(2)}/wear` : "Log outfits to start"),
      ],
    },
    {
      title: "Wardrobe Size",
      badges: [
        buildBadge("items-10", "👕", "Just Getting Started", "Ten pieces logged. The digitising has begun!",
          clamp(items.length / 10), `${Math.min(items.length, 10)}/10 items`),
        buildBadge("items-25", "🧥", "Building the Archive", "25 pieces added. Your closet's officially getting bigger now!",
          clamp(items.length / 25), `${Math.min(items.length, 25)}/25 items`),
        buildBadge("items-50", "👑", "Stacked Inventory", "50 items added. You basically have a walk-in wardrobe!",
          clamp(items.length / 50), `${Math.min(items.length, 50)}/50 items`),
      ],
    },
    {
      title: "Outfits Logged",
      badges: [
        buildBadge("outfits-1", "📅", "One Day or Day One", "The beginning of many fire outfits to come?",
          clamp(outfitCount / 1), `${Math.min(outfitCount, 1)}/1 outfit`),
        buildBadge("outfits-10", "📆", "Creature of Habit (the good kind)", "10 outfits logged and counting.",
          clamp(outfitCount / 10), `${Math.min(outfitCount, 10)}/10 outfits`),
        buildBadge("outfits-100", "🗓️", "Century Club", "100 outfits logged. At this point, you could write a book titled What I Wore.",
          clamp(outfitCount / 100), `${Math.min(outfitCount, 100)}/100 outfits`),
      ],
    },
    {
      title: "Anniversary",
      badges: [
        buildBadge("anniversary-1", "🎂", "First CLOAKDaversary", "One year of not staring blankly into your closet every morning.",
          clamp(accountAgeDays / 365), `${Math.min(accountAgeDays, 365)}/365 days`),
        buildBadge("anniversary-5", "🎊", "CLOAKD Legend", "5 years in. You've probably outlasted some of your actual clothes.",
          clamp(accountAgeDays / (365 * 5)), `${Math.min(accountAgeDays, 365 * 5)}/${365 * 5} days`),
        buildBadge("anniversary-10", "🏆", "CLOAKD GOAT", "A full decade. We should be paying you at this point!",
          clamp(accountAgeDays / (365 * 10)), `${Math.min(accountAgeDays, 365 * 10)}/${365 * 10} days`),
      ],
    },
    {
      title: "Community Likes",
      badges: [
        buildBadge("likes-1", "👍", "First Like", "You received your first like on a post",
          clamp(totalLikes / 1), `${Math.min(totalLikes, 1)}/1 like`),
        buildBadge("likes-10", "❤️", "Getting Noticed", "Double digits. People are watching now.",
          clamp(totalLikes / 10), `${Math.min(totalLikes, 10)}/10 likes`),
        buildBadge("likes-100", "🌟", "Fan Favourite", "100 likes. You're basically a fashion icon at this point",
          clamp(totalLikes / 100), `${Math.min(totalLikes, 100)}/100 likes`),
        buildBadge("likes-1000", "💫", "Cloakd Celebrity", "1,000 likes. Time to start signing autographs.",
          clamp(totalLikes / 1000), `${Math.min(totalLikes, 1000)}/1000 likes`),
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
                <Image
                  source={BADGE_IMAGES[badge.id]}
                  style={[styles.badgeImage, !badge.conditionMet && styles.badgeImageLocked]}
                />
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
            {sharingBadge && (
              <Image source={BADGE_IMAGES[sharingBadge.id]} style={styles.modalImage} />
            )}
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
  badgeImage: { width: 64, height: 64, marginBottom: 8 },
  badgeImageLocked: { opacity: 0.35 },
  modalImage: { width: 72, height: 72, marginBottom: 8 },
});