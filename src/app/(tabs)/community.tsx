import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert, Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity, View,
} from "react-native";
import ClothingIcon from "../../components/ClothingIcon";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";
import { BADGE_IMAGES } from "../../utils/badgeImages";

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  colour: string;
  subcategory: string;
  brand?: string;
  price?: number;
  material?: string;
  image_url?: string | null;
};

type OutfitLog = {
  id: string;
  date: string;
  items: ClothingItem[];
};

type CommunityPost = {
  id: string;
  user_id: string;
  username: string;
  caption: string;
  photo_url: string | null;
  outfit_date: string | null;
  created_at: string;
  streak: number;
  items: ClothingItem[];
  post_type?: string;
  badge_id?: string | null;
  badge_title?: string | null;
  badge_emoji?: string | null;
};

type LikeInfo = {
  count: number;
  liked: boolean;
  likers: string[];
};

function DynamicImage({ uri }: { uri: string }) {
  const [aspectRatio, setAspectRatio] = useState(1);
  useEffect(() => {
    Image.getSize(uri, (w, h) => { if (h > 0) setAspectRatio(w / h); });
  }, [uri]);
  return (
    <Image
      source={{ uri }}
      style={{ width: "55%", aspectRatio, borderRadius: 8, marginBottom: 10, alignSelf: "center" }}
      resizeMode="cover"
    />
  );
}

const BADGE_DESCRIPTIONS: Record<string, { description: string; category: string }> = {
  "signup":      { description: "Create your account", category: "Welcome" },
  "streak-7":    { description: "Log outfits 7 days in a row", category: "Streaks" },
  "streak-30":   { description: "Log outfits 30 days in a row", category: "Streaks" },
  "streak-100":  { description: "Log outfits 100 days in a row", category: "Streaks" },
  "cpw-5":       { description: "Get one item's cost-per-wear under $5", category: "Smart Spending" },
  "cpw-1":       { description: "Get one item's cost-per-wear under $1", category: "Smart Spending" },
  "items-10":    { description: "Add 10 items to your wardrobe", category: "Wardrobe" },
  "items-25":    { description: "Add 25 items to your wardrobe", category: "Wardrobe" },
  "items-50":    { description: "Add 50 items to your wardrobe", category: "Wardrobe" },
  "outfits-1":   { description: "Log your first outfit", category: "Outfits" },
  "outfits-10":  { description: "Log 10 outfits", category: "Outfits" },
  "outfits-100": { description: "Log 100 outfits", category: "Outfits" },
  "likes-10":            { description: "Get 10 likes on a post with a logged outfit", category: "Community" },
  "likes-40":            { description: "Get 40 likes on a post with a logged outfit", category: "Community" },
  "likes-100":           { description: "Get 100 likes on a post with a logged outfit", category: "Community" },
  "early-adopter":       { description: "Log an outfit within your first week of joining", category: "Getting Started" },
  "first-post":          { description: "Share your first outfit to the community", category: "Getting Started" },
  "conversation-starter":{ description: "Get 3 likes on a post with a logged outfit", category: "Community" },
  "fan-favourite":       { description: "Have the same person like 5 of your posts", category: "Community" },
  "rainbow-dresser":     { description: "Wear 5 different colours in one week", category: "Style Diversity" },
  "brand-hopper":        { description: "Wear 5 different brands in one week", category: "Style Diversity" },
  "old-faithful":        { description: "Wear the same item 10 times", category: "Outfit Recycler" },
  "wardrobe-warrior":    { description: "Wear the same item 50 times", category: "Outfit Recycler" },
  "vintage-lover":       { description: "Log an item that's been in your wardrobe for 1+ year", category: "Outfit Recycler" },
  "investment-piece":    { description: "Add an item worth over $200", category: "Wardrobe Health" },
};

export default function Community() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserStreak, setCurrentUserStreak] = useState(0);
  const [likesMap, setLikesMap] = useState<Record<string, LikeInfo>>({});
  const [likersModalPost, setLikersModalPost] = useState<CommunityPost | null>(null);
  const [selectedClothingItem, setSelectedClothingItem] = useState<ClothingItem | null>(null);
  const [badgeDetailPost, setBadgeDetailPost] = useState<CommunityPost | null>(null);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<OutfitLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<OutfitLog | null>(null);
  const [caption, setCaption] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [viewingPost, setViewingPost] = useState<CommunityPost | null>(null);
  const [trendingPosts, setTrendingPosts] = useState<CommunityPost[]>([]);
  const [privateUserIds, setPrivateUserIds] = useState<Set<string>>(new Set());

  const getUser = () =>
    new Promise<any>((resolve) => {
      const unsub = auth.onAuthStateChanged((u) => { unsub(); resolve(u); });
    });

  const computeStreak = async (uid: string): Promise<number> => {
    const { data } = await supabase
      .from("outfit_logs")
      .select("date")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(400);
    if (!data || data.length === 0) return 0;
    const dates = [...new Set(data.map((r: any) => r.date as string))].sort().reverse();
    const toStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = toStr(new Date());
    const yesterday = toStr(new Date(Date.now() - 86400000));
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let count = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + "T12:00:00");
      const curr = new Date(dates[i] + "T12:00:00");
      const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) { count++; } else { break; }
    }
    return count >= 2 ? count : 0;
  };

  useEffect(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const scored = posts
      .filter((p) => p.post_type !== "badge" && !privateUserIds.has(p.user_id))
      .map((p) => {
        const likeCount = likesMap[p.id]?.count ?? 0;
        const ageMs = now - new Date(p.created_at).getTime();
        const ageHours = Math.max(0, ageMs / 3600000);
        const isRecent = ageMs <= sevenDaysMs;
        const score = isRecent ? likeCount / Math.pow(ageHours + 2, 1.5) : 0;
        return { post: p, score, likeCount, isRecent };
      })
      .filter((s) => s.isRecent && s.likeCount > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((s) => s.post);
    setTrendingPosts(scored);
  }, [posts, likesMap]);

  const fetchFeed = async () => {
    setLoadingFeed(true);
    try {
      const user = await getUser();
      const uid: string | null = user ? user.uid : null;
      if (user) {
        setCurrentUserId(user.uid);
        computeStreak(user.uid).then(setCurrentUserStreak);
      }

      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) { console.error("fetchFeed community_posts error:", error.message); return; }

      const posterIds = [...new Set((data || []).map((p: any) => p.user_id as string))];
      let visibilityMap: Record<string, string> = {};
      if (posterIds.length > 0) {
        const { data: settingsData, error: settingsError } = await supabase
          .from("user_settings")
          .select("firebase_uid, profile_visibility")
          .in("firebase_uid", posterIds);
        if (settingsError) console.error("fetchFeed visibility error:", settingsError.message);
        visibilityMap = Object.fromEntries(
          (settingsData || []).map((s: any) => [s.firebase_uid, s.profile_visibility ?? "public"])
        );
      }
      setPrivateUserIds(new Set(Object.entries(visibilityMap).filter(([, v]) => v === "private").map(([uid]) => uid)));

      const visiblePosts = (data || []).filter(
        (post: any) => visibilityMap[post.user_id] !== "private" || post.user_id === uid
      );

      const enriched: CommunityPost[] = [];
      for (const post of visiblePosts) {
        if (post.post_type === "badge" || !post.outfit_log_id) {
          enriched.push({ ...post, items: [] });
          continue;
        }
        const { data: logItems, error: itemsError } = await supabase
          .from("outfit_log_items")
          .select("clothing_item_id, clothing_items(id, name, category, colour, subcategory, brand, price, material, image_url)")
          .eq("outfit_log_id", post.outfit_log_id);
        if (itemsError) console.error("fetchFeed items error:", itemsError.message);
        enriched.push({
          ...post,
          items: (logItems || []).map((li: any) => li.clothing_items).filter(Boolean),
        });
      }
      setPosts(enriched);
      await fetchLikes(enriched.map((p) => p.id), uid);
    } catch (e) {
      console.error("fetchFeed unexpected error:", e);
    } finally {
      setLoadingFeed(false);
    }
  };

  const fetchLikes = async (postIds: string[], userId: string | null) => {
    if (postIds.length === 0) return;
    const { data, error } = await supabase
      .from("post_likes")
      .select("post_id, user_id, username")
      .in("post_id", postIds);
    if (error) { console.error("fetchLikes error:", error.message); return; }


    const uniqueUserIds = [...new Set((data || []).map((r: any) => r.user_id as string))];
    let usernameMap: Record<string, string> = {};
    if (uniqueUserIds.length > 0) {
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("firebase_uid, username")
        .in("firebase_uid", uniqueUserIds);
      usernameMap = Object.fromEntries(
        (settingsData || []).map((u: any) => [u.firebase_uid, u.username])
      );
    }

    const map: Record<string, LikeInfo> = {};
    for (const postId of postIds) {
      const rows = (data || []).filter((r: any) => r.post_id === postId);
      map[postId] = {
        count: rows.length,
        liked: rows.some((r: any) => r.user_id === userId),
        likers: rows.map((r: any) => usernameMap[r.user_id] || r.username),
      };
    }
    setLikesMap(map);
  };

  const toggleLike = async (postId: string) => {
    const user = await getUser();
    if (!user) return;
    const current = likesMap[postId] ?? { count: 0, liked: false, likers: [] };
    if (current.liked) {
      setLikesMap((prev) => ({
        ...prev,
        [postId]: { count: Math.max(0, current.count - 1), liked: false, likers: current.likers.slice(0, -1) },
      }));
      const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.uid);
      if (error) {
        console.error("unlike error:", error.message);
        setLikesMap((prev) => ({ ...prev, [postId]: current }));
      }
    } else {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("username")
        .eq("firebase_uid", user.uid)
        .single();
      const username = settings?.username || "Anonymous";
      setLikesMap((prev) => ({
        ...prev,
        [postId]: { count: current.count + 1, liked: true, likers: [...current.likers, username] },
      }));
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.uid, username });
      if (error) {
        console.error("like error:", error.message);
        setLikesMap((prev) => ({ ...prev, [postId]: current }));
      }
    }
  };

  const fetchLogs = useCallback(async (month: Date) => {
    const user = await getUser();
    if (!user) return;
    const year = month.getFullYear();
    const m = month.getMonth();
    const start = `${year}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${year}-${String(m + 1).padStart(2, "0")}-${new Date(year, m + 1, 0).getDate()}`;
    const { data: logData } = await supabase
      .from("outfit_logs")
      .select("id, date")
      .eq("user_id", user.uid)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });
    if (!logData) return;

    const withItems: OutfitLog[] = [];
    for (const log of logData) {
      const { data: logItems } = await supabase
        .from("outfit_log_items")
        .select("clothing_item_id, clothing_items(id, name, category, colour, subcategory, brand, price, material, image_url)")
        .eq("outfit_log_id", log.id);
      withItems.push({
        id: log.id,
        date: log.date,
        items: (logItems || []).map((li: any) => li.clothing_items).filter(Boolean),
      });
    }
    setLogs(withItems);
  }, []);

  useFocusEffect(useCallback(() => { fetchFeed(); }, []));

  const openShareModal = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedLog(null);
    setCaption("");
    setPhotoUri(null);
    fetchLogs(now);
    setShareModalVisible(true);
  };

  const openEditModal = (post: CommunityPost) => {
    setEditingPost(post);
    setCaption(post.caption || "");
    setPhotoUri(post.photo_url || null);
    setEditModalVisible(true);
  };

  const handleMonthChange = (direction: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction);
    setCurrentMonth(d);
    fetchLogs(d);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      if (Platform.OS === "web") window.alert("Camera roll permission is required.");
      else Alert.alert("Permission required", "Camera roll permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string, userId: string): Promise<string | null> => {
    try {
      const ext = "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;

      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        const { error } = await supabase.storage
          .from("community-posts")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (error) { console.error("Upload error:", error); return null; }
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();
        const { error } = await supabase.storage
          .from("community-posts")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (error) { console.error("Upload error:", error); return null; }
      }

      const { data } = supabase.storage.from("community-posts").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.error("Upload exception:", e);
      return null;
    }
  };

  const handleShare = async () => {
    if (!selectedLog) return;
    setSharing(true);
    const user = await getUser();
    if (!user) { setSharing(false); return; }

    const [{ data: settings }, currentStreak, uploadedUrl] = await Promise.all([
      supabase.from("user_settings").select("username").eq("firebase_uid", user.uid).single(),
      computeStreak(user.uid),
      photoUri && !photoUri.startsWith("http") ? uploadPhoto(photoUri, user.uid) : Promise.resolve(null),
    ]);

    const { error } = await supabase.from("community_posts").insert({
      user_id: user.uid,
      username: settings?.username || "Anonymous",
      outfit_log_id: selectedLog.id,
      outfit_date: selectedLog.date,
      caption: caption.trim(),
      photo_url: uploadedUrl,
      streak: currentStreak,
    });

    setSharing(false);
    if (error) {
      if (Platform.OS === "web") window.alert("Failed to share: " + error.message);
      else Alert.alert("Error", error.message);
      return;
    }
    setShareModalVisible(false);
    setSelectedLog(null);
    setCaption("");
    setPhotoUri(null);
    fetchFeed();
  };

  const handleEdit = async () => {
    if (!editingPost) return;
    setSharing(true);
    const user = await getUser();
    if (!user) { setSharing(false); return; }

    let finalPhotoUrl = editingPost.photo_url;
    if (photoUri && !photoUri.startsWith("http")) {
      finalPhotoUrl = await uploadPhoto(photoUri, user.uid);
    } else if (!photoUri) {
      finalPhotoUrl = null;
    }

    const { error } = await supabase
      .from("community_posts")
      .update({ caption: caption.trim(), photo_url: finalPhotoUrl })
      .eq("id", editingPost.id);

    setSharing(false);
    if (error) {
      if (Platform.OS === "web") window.alert("Failed to update: " + error.message);
      else Alert.alert("Error", error.message);
      return;
    }
    setEditModalVisible(false);
    setEditingPost(null);
    setCaption("");
    setPhotoUri(null);
    fetchFeed();
  };

  const handleDelete = async (postId: string) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Delete this post?")
        : await new Promise<boolean>((resolve) => {
            Alert.alert("Delete Post", "Are you sure?", [
              { text: "Cancel", onPress: () => resolve(false) },
              { text: "Delete", style: "destructive", onPress: () => resolve(true) },
            ]);
          });
    if (!confirmed) return;
    await supabase.from("community_posts").delete().eq("id", postId);
    fetchFeed();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTimeAgo = (isoStr: string) => {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const DAY_SIZE = 40;

  const renderItemChips = (items: ClothingItem[]) => (
    <View style={styles.itemsRow}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.itemChip}
          onPress={(e) => { e.stopPropagation(); setSelectedClothingItem(item); }}
          activeOpacity={0.7}
        >
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.itemChipPhoto} resizeMode="contain" />
          ) : (
            <ClothingIcon category={item.category} subcategory={item.subcategory} size={14} colour={item.colour} />
          )}
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemColour}>{item.colour}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTrendingCard = (post: CommunityPost) => (
    <TouchableOpacity
      key={`trending-${post.id}`}
      style={styles.trendingCard}
      onPress={() => setViewingPost(post)}
      activeOpacity={0.85}
    >
      <View style={styles.trendingImageBox}>
        {post.photo_url ? (
          <Image source={{ uri: post.photo_url }} style={styles.trendingImage} resizeMode="cover" />
        ) : post.items[0]?.image_url ? (
          <Image source={{ uri: post.items[0].image_url }} style={styles.trendingImage} resizeMode="contain" />
        ) : post.items[0] ? (
          <ClothingIcon category={post.items[0].category} subcategory={post.items[0].subcategory} size={40} colour={post.items[0].colour} />
        ) : (
          <Text style={styles.trendingPlaceholder}>👗</Text>
        )}
      </View>
      <Text style={styles.trendingUsername} numberOfLines={1}>{post.username}</Text>
      <View style={styles.trendingLikesRow}>
        <Text style={styles.trendingHeart}>♥</Text>
        <Text style={styles.trendingLikeCount}>{likesMap[post.id]?.count ?? 0}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPhotoSection = (isEdit = false) => (
    <View style={styles.photoSection}>
      {photoUri ? (
        <View style={styles.photoPreviewWrapper}>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="contain" />
          <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotoUri(null)}>
            <Text style={styles.photoRemoveText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.photoPickerBtn} onPress={pickImage}>
          <Text style={styles.photoPickerIcon}>📷</Text>
          <Text style={styles.photoPickerText}>
            {isEdit ? "Change photo" : "Add a photo (optional)"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <View style={{ width: 60 }} />
      </View>

      {trendingPosts.length > 0 && (
        <View style={styles.trendingSection}>
          <Text style={styles.trendingSectionTitle}>🔥 Trending Outfits of the Week</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScrollContent}
          >
            {trendingPosts.map(renderTrendingCard)}
          </ScrollView>
        </View>
      )}

      {loadingFeed ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7B7FE8" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🌐</Text>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtext}>Be the first to share an outfit</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.feed} showsVerticalScrollIndicator={false}>
          {posts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.postCard} onPress={() => setViewingPost(post)} activeOpacity={0.85}>
              <View style={styles.postHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{post.username.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.postMeta}>
                  <View style={styles.usernameRow}>
                    <Text style={styles.username}>{post.username}</Text>
                    {post.user_id === currentUserId && currentUserStreak >= 2 && (
                      <View style={styles.streakBadge}>
                        <Text style={styles.streakBadgeText}>🔥 {currentUserStreak}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.postMetaRow}>
                    {post.outfit_date ? (
                      <Text style={styles.outfitDate}>📅 {formatDate(post.outfit_date)}</Text>
                    ) : null}
                    <Text style={styles.postTime}>{formatTimeAgo(post.created_at)}</Text>
                  </View>
                </View>
                {post.user_id === currentUserId && (
                  <View style={styles.postActions}>
                    {post.post_type !== "badge" && (
                      <TouchableOpacity onPress={() => openEditModal(post)} style={styles.actionBtn}>
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(post.id)} style={[styles.actionBtn, styles.actionBtnDelete]}>
                      <Text style={styles.actionBtnDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {post.post_type === "badge" ? (
                <View style={styles.badgeShareCard}>
                  {post.badge_id && (
                    <Image source={BADGE_IMAGES[post.badge_id]} style={styles.badgeShareImage} />
                  )}
                  <Text style={styles.badgeShareTitle}>{post.badge_title}</Text>
                </View>
              ) : (
                <>
                  {post.photo_url ? (
                    <DynamicImage uri={post.photo_url} />
                  ) : null}
                  {renderItemChips(post.items)}
                </>
              )}
              {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
              <View style={styles.likeRow}>
                <TouchableOpacity
                  style={styles.likeBtn}
                  onPress={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                >
                  <Text style={[styles.likeHeart, likesMap[post.id]?.liked && styles.likeHeartActive]}>
                    {likesMap[post.id]?.liked ? "♥" : "♡"}
                  </Text>
                  <Text style={styles.likeCount}>{likesMap[post.id]?.count ?? 0}</Text>
                </TouchableOpacity>
                {(likesMap[post.id]?.count ?? 0) > 0 && (
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); setLikersModalPost(post); }}>
                    <Text style={styles.likersLink}>
                      {likesMap[post.id]?.likers.slice(0, 2).join(", ")}
                      {(likesMap[post.id]?.count ?? 0) > 2 ? ` +${(likesMap[post.id]?.count ?? 0) - 2} more` : ""}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={openShareModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Share Modal */}
      <Modal visible={shareModalVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share an Outfit</Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={() => handleMonthChange(-1)}>
                  <Text style={styles.monthArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </Text>
                <TouchableOpacity onPress={() => handleMonthChange(1)}>
                  <Text style={styles.monthArrow}>→</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calGrid}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <View key={i} style={[styles.calCell, { width: DAY_SIZE, height: DAY_SIZE }]}>
                    <Text style={styles.calDayLabel}>{d}</Text>
                  </View>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`e-${i}`} style={[styles.calCell, { width: DAY_SIZE, height: DAY_SIZE }]} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const log = logs.find((l) => l.date === dateStr);
                  const isSelected = selectedLog?.date === dateStr;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calCell, { width: DAY_SIZE, height: DAY_SIZE },
                        log && styles.calCellLogged,
                        isSelected && styles.calCellSelected,
                      ]}
                      onPress={() => log && setSelectedLog(isSelected ? null : log)}
                      disabled={!log}
                    >
                      <Text style={[styles.calDayNum, isSelected && styles.calDayNumSelected]}>{day}</Text>
                      {log && <View style={[styles.calDot, isSelected && styles.calDotSelected]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedLog ? (
                <View style={styles.selectedOutfit}>
                  <Text style={styles.selectedDate}>📅 {formatDate(selectedLog.date)}</Text>
                  <View style={styles.selectedItems}>
                    {selectedLog.items.map((item) => (
                      <View key={item.id} style={styles.selectedItemChip}>
                        <ClothingIcon category={item.category} subcategory={item.subcategory} size={13} colour={item.colour} />
                        <Text style={styles.selectedItemText}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.selectPrompt}>Tap a highlighted date to select an outfit</Text>
              )}

              {renderPhotoSection(false)}

              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption... (optional)"
                placeholderTextColor="#555"
                value={caption}
                onChangeText={setCaption}
                maxLength={200}
                multiline
              />

              <TouchableOpacity
                style={[styles.shareBtn, (!selectedLog || sharing) && styles.shareBtnDisabled]}
                onPress={handleShare}
                disabled={!selectedLog || sharing}
              >
                {sharing ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareBtnText}>Share to Community</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity onPress={() => { setEditModalVisible(false); setEditingPost(null); setCaption(""); setPhotoUri(null); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {editingPost && (
                <View style={styles.selectedOutfit}>
                  <Text style={styles.selectedDate}>📅 {formatDate(editingPost.outfit_date!)}</Text>
                  <View style={styles.selectedItems}>
                    {editingPost.items.map((item) => (
                      <View key={item.id} style={styles.selectedItemChip}>
                        <ClothingIcon category={item.category} subcategory={item.subcategory} size={13} colour={item.colour} />
                        <Text style={styles.selectedItemText}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {renderPhotoSection(true)}

              <TextInput
                style={styles.captionInput}
                placeholder="Edit caption..."
                placeholderTextColor="#555"
                value={caption}
                onChangeText={setCaption}
                maxLength={200}
                multiline
              />

              <TouchableOpacity
                style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
                onPress={handleEdit}
                disabled={sharing}
              >
                {sharing ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Clothing detail modal */}
      <Modal visible={!!selectedClothingItem} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.clothingDetailBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Item Details</Text>
              <TouchableOpacity onPress={() => setSelectedClothingItem(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedClothingItem && (
              <>
                <View style={styles.clothingIconLarge}>
                  <ClothingIcon
                    category={selectedClothingItem.category}
                    subcategory={selectedClothingItem.subcategory}
                    size={80}
                    colour={selectedClothingItem.colour}
                  />
                </View>
                <Text style={styles.clothingDetailName}>{selectedClothingItem.name}</Text>
                <View style={styles.clothingDetailRows}>
                  <View style={styles.clothingDetailRow}>
                    <Text style={styles.clothingDetailLabel}>Type</Text>
                    <Text style={styles.clothingDetailValue}>
                      {selectedClothingItem.category}{selectedClothingItem.subcategory ? ` · ${selectedClothingItem.subcategory}` : ""}
                    </Text>
                  </View>
                  <View style={styles.clothingDetailRow}>
                    <Text style={styles.clothingDetailLabel}>Colour</Text>
                    <Text style={styles.clothingDetailValue}>{selectedClothingItem.colour}</Text>
                  </View>
                  {selectedClothingItem.brand ? (
                    <View style={styles.clothingDetailRow}>
                      <Text style={styles.clothingDetailLabel}>Brand</Text>
                      <Text style={styles.clothingDetailValue}>{selectedClothingItem.brand}</Text>
                    </View>
                  ) : null}
                  {selectedClothingItem.price != null && selectedClothingItem.price > 0 ? (
                    <View style={styles.clothingDetailRow}>
                      <Text style={styles.clothingDetailLabel}>Cost</Text>
                      <Text style={styles.clothingDetailValue}>${selectedClothingItem.price.toFixed(2)}</Text>
                    </View>
                  ) : null}
                  {selectedClothingItem.material ? (
                    <View style={styles.clothingDetailRow}>
                      <Text style={styles.clothingDetailLabel}>Material</Text>
                      <Text style={styles.clothingDetailValue}>{selectedClothingItem.material}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Likers modal */}
      <Modal visible={!!likersModalPost} animationType="fade" transparent presentationStyle="overFullScreen">
        <View style={styles.likersModalOverlay}>
          <View style={styles.likersModalBox}>
            <Text style={styles.likersModalTitle}>Liked by</Text>
            {likersModalPost && (likesMap[likersModalPost.id]?.likers.length ?? 0) > 0 ? (
              likesMap[likersModalPost.id].likers.map((name, i) => (
                <Text key={i} style={styles.likersModalName}>{name}</Text>
              ))
            ) : (
              <Text style={styles.likersModalEmpty}>No likes yet</Text>
            )}
            <TouchableOpacity onPress={() => setLikersModalPost(null)}>
              <Text style={styles.likersModalClose}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-screen post modal */}
      <Modal visible={!!viewingPost} animationType="fade" transparent presentationStyle="overFullScreen">
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => { setViewingPost(null); setSelectedClothingItem(null); }}>
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          {viewingPost && (
            <ScrollView contentContainerStyle={styles.fullscreenContent} showsVerticalScrollIndicator={false}>
              <View style={styles.fullscreenHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{viewingPost.username.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.postMeta}>
                  <Text style={styles.username}>{viewingPost.username}</Text>
                  <View style={styles.postMetaRow}>
                    {viewingPost.outfit_date ? (
                      <Text style={styles.outfitDate}>📅 {formatDate(viewingPost.outfit_date)}</Text>
                    ) : null}
                    <Text style={styles.postTime}>{formatTimeAgo(viewingPost.created_at)}</Text>
                  </View>
                </View>
              </View>

              {viewingPost.caption ? (
                <Text style={styles.fullscreenCaption}>{viewingPost.caption}</Text>
              ) : null}

              <View style={styles.likeRow}>
                <TouchableOpacity style={styles.likeBtn} onPress={() => toggleLike(viewingPost.id)}>
                  <Text style={[styles.likeHeart, likesMap[viewingPost.id]?.liked && styles.likeHeartActive]}>
                    {likesMap[viewingPost.id]?.liked ? "♥" : "♡"}
                  </Text>
                  <Text style={styles.likeCount}>{likesMap[viewingPost.id]?.count ?? 0} likes</Text>
                </TouchableOpacity>
                {(likesMap[viewingPost.id]?.count ?? 0) > 0 && (
                  <TouchableOpacity onPress={() => setLikersModalPost(viewingPost)}>
                    <Text style={styles.likersLink}>See who liked</Text>
                  </TouchableOpacity>
                )}
              </View>

              {viewingPost.post_type === "badge" ? (
                <TouchableOpacity
                  style={styles.fullscreenBadgeCard}
                  onPress={() => setBadgeDetailPost(viewingPost)}
                  activeOpacity={0.75}
                >
                  {viewingPost.badge_id && BADGE_IMAGES[viewingPost.badge_id]
                    ? <Image source={BADGE_IMAGES[viewingPost.badge_id]} style={styles.fullscreenBadgeImage} />
                    : <Text style={styles.fullscreenBadgeEmoji}>{viewingPost.badge_emoji}</Text>
                  }
                  <Text style={styles.fullscreenBadgeTitle}>{viewingPost.badge_title}</Text>
                  <Text style={styles.fullscreenBadgeTap}>Tap to learn more</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.fullscreenIconGrid}>
                    {viewingPost.items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.fullscreenIconCard}
                        onPress={() => setSelectedClothingItem(item)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.fullscreenIconBg}>
                          {item.image_url ? (
                            <Image source={{ uri: item.image_url }} style={styles.fullscreenItemPhoto} resizeMode="contain" />
                          ) : (
                            <ClothingIcon
                              category={item.category}
                              subcategory={item.subcategory}
                              size={64}
                              colour={item.colour}
                            />
                          )}
                        </View>
                        <Text style={styles.fullscreenIconName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.fullscreenIconColour}>{item.colour}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {viewingPost.photo_url ? (
                    <Image
                      source={{ uri: viewingPost.photo_url }}
                      style={styles.fullscreenPhoto}
                      resizeMode="contain"
                    />
                  ) : null}
                </>
              )}
            </ScrollView>
          )}

          {/* Item detail popup — rendered as sibling inside the fullscreen overlay so it appears on top */}
          {selectedClothingItem && (
            <TouchableOpacity
              style={styles.badgeDetailOverlay}
              activeOpacity={1}
              onPress={() => setSelectedClothingItem(null)}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.clothingDetailBox}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Item Details</Text>
                    <TouchableOpacity onPress={() => setSelectedClothingItem(null)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.clothingIconLarge}>
                    {selectedClothingItem.image_url ? (
                      <Image source={{ uri: selectedClothingItem.image_url }} style={styles.clothingDetailPhoto} resizeMode="contain" />
                    ) : (
                      <ClothingIcon
                        category={selectedClothingItem.category}
                        subcategory={selectedClothingItem.subcategory}
                        size={80}
                        colour={selectedClothingItem.colour}
                      />
                    )}
                  </View>
                  <Text style={styles.clothingDetailName}>{selectedClothingItem.name}</Text>
                  <View style={styles.clothingDetailRows}>
                    <View style={styles.clothingDetailRow}>
                      <Text style={styles.clothingDetailLabel}>Type</Text>
                      <Text style={styles.clothingDetailValue}>
                        {selectedClothingItem.category}{selectedClothingItem.subcategory ? ` · ${selectedClothingItem.subcategory}` : ""}
                      </Text>
                    </View>
                    <View style={styles.clothingDetailRow}>
                      <Text style={styles.clothingDetailLabel}>Colour</Text>
                      <Text style={styles.clothingDetailValue}>{selectedClothingItem.colour}</Text>
                    </View>
                    {selectedClothingItem.brand ? (
                      <View style={styles.clothingDetailRow}>
                        <Text style={styles.clothingDetailLabel}>Brand</Text>
                        <Text style={styles.clothingDetailValue}>{selectedClothingItem.brand}</Text>
                      </View>
                    ) : null}
                    {selectedClothingItem.price != null && selectedClothingItem.price > 0 ? (
                      <View style={styles.clothingDetailRow}>
                        <Text style={styles.clothingDetailLabel}>Cost</Text>
                        <Text style={styles.clothingDetailValue}>${selectedClothingItem.price.toFixed(2)}</Text>
                      </View>
                    ) : null}
                    {selectedClothingItem.material ? (
                      <View style={styles.clothingDetailRow}>
                        <Text style={styles.clothingDetailLabel}>Material</Text>
                        <Text style={styles.clothingDetailValue}>{selectedClothingItem.material}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Badge detail popup — rendered as sibling inside the fullscreen overlay so it appears on top */}
          {badgeDetailPost && (
            <TouchableOpacity
              style={styles.badgeDetailOverlay}
              activeOpacity={1}
              onPress={() => setBadgeDetailPost(null)}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.badgeDetailBox}>
                  <Text style={styles.badgeDetailEmoji}>{badgeDetailPost.badge_emoji}</Text>
                  <Text style={styles.badgeDetailTitle}>{badgeDetailPost.badge_title}</Text>
                  <Text style={styles.badgeDetailCategory}>
                    {badgeDetailPost.badge_id ? (BADGE_DESCRIPTIONS[badgeDetailPost.badge_id]?.category ?? "Achievement") : "Achievement"}
                  </Text>
                  <View style={styles.badgeDetailDivider} />
                  <Text style={styles.badgeDetailDesc}>
                    {badgeDetailPost.badge_id ? (BADGE_DESCRIPTIONS[badgeDetailPost.badge_id]?.description ?? "A special achievement badge.") : "A special achievement badge."}
                  </Text>
                  <TouchableOpacity onPress={() => setBadgeDetailPost(null)}>
                    <Text style={styles.badgeDetailClose}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60 },
  header: { paddingHorizontal: 24, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backText: { color: "#7B7FE8", fontSize: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  emptySubtext: { color: "#888", fontSize: 14 },
  feed: { paddingHorizontal: 16, paddingBottom: 100 },
  postCard: {
    backgroundColor: "#111", borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: "#222",
  },
  postHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#7B7FE8", justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  postMeta: { flex: 1 },
  postMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  username: { color: "#fff", fontWeight: "600", fontSize: 14 },
  outfitDate: { color: "#7B7FE8", fontSize: 11 },
  postTime: { color: "#555", fontSize: 11 },
  postActions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: "#222", borderWidth: 1, borderColor: "#333",
  },
  actionBtnText: { color: "#aaa", fontSize: 12 },
  actionBtnDelete: { backgroundColor: "#1a0000", borderColor: "#440000" },
  actionBtnDeleteText: { color: "#ff4444", fontSize: 12 },
  postPhoto: { width: "40%", aspectRatio: 4/3, borderRadius: 8, marginBottom: 10, alignSelf: "center" },
  itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  itemChip: {
    backgroundColor: "#1a1a1a", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#2a2a2a",
  },
  itemName: { color: "#ccc", fontSize: 12, maxWidth: 80 },
  itemColour: { color: "#555", fontSize: 11 },
  caption: { color: "#aaa", fontSize: 13, marginTop: 2 },
  trendingSection: { marginBottom: 16 },
  trendingSectionTitle: { color: "#fff", fontSize: 15, fontWeight: "bold", marginBottom: 10, paddingHorizontal: 16 },
  trendingScrollContent: { paddingHorizontal: 16, gap: 10 },
  trendingCard: {
    width: 120, backgroundColor: "#111", borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: "#222", marginRight: 10,
  },
  trendingImageBox: {
    width: "100%", height: 90, borderRadius: 8, backgroundColor: "#2e2e3a",
    justifyContent: "center", alignItems: "center", marginBottom: 8, overflow: "hidden",
  },
  trendingImage: { width: "100%", height: "100%" },
  trendingPlaceholder: { fontSize: 32 },
  trendingUsername: { color: "#ccc", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  trendingLikesRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendingHeart: { color: "#e05c7a", fontSize: 12 },
  trendingLikeCount: { color: "#888", fontSize: 12 },
  fab: {
    position: "absolute", bottom: 90, right: 24,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#7B7FE8", justifyContent: "center", alignItems: "center",
    shadowColor: "#7B7FE8", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32, fontWeight: "300" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#111", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36, maxHeight: "90%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  modalClose: { color: "#555", fontSize: 20 },
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  monthArrow: { color: "#7B7FE8", fontSize: 20, paddingHorizontal: 8 },
  monthLabel: { color: "#fff", fontSize: 15, fontWeight: "600" },
  calGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", marginBottom: 12 },
  calDayLabel: { color: "#555", fontSize: 11, textAlign: "center" },
  calCell: { justifyContent: "center", alignItems: "center", borderRadius: 6, margin: 2 },
  calCellLogged: { backgroundColor: "#1a1a2e" },
  calCellSelected: { backgroundColor: "#7B7FE8" },
  calDayNum: { color: "#888", fontSize: 12 },
  calDayNumSelected: { color: "#fff", fontWeight: "bold" },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#7B7FE8", marginTop: 1 },
  calDotSelected: { backgroundColor: "#fff" },
  selectedOutfit: {
    backgroundColor: "#1a1a1a", borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#333",
  },
  selectedDate: { color: "#7B7FE8", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  selectedItems: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  selectedItemChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#222", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  selectedItemText: { color: "#ddd", fontSize: 12 },
  selectPrompt: { color: "#555", fontSize: 13, textAlign: "center", marginVertical: 12 },
  photoSection: { marginBottom: 14 },
  photoPickerBtn: {
    borderWidth: 1, borderColor: "#333", borderRadius: 10, borderStyle: "dashed",
    padding: 16, alignItems: "center", flexDirection: "row", gap: 10, backgroundColor: "#1a1a1a",
  },
  photoPickerIcon: { fontSize: 20 },
  photoPickerText: { color: "#666", fontSize: 14 },
  photoPreviewWrapper: { position: "relative" },
  photoPreview: { width: "100%", height: 200, borderRadius: 10 },
  photoRemove: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12,
    width: 24, height: 24, justifyContent: "center", alignItems: "center",
  },
  photoRemoveText: { color: "#fff", fontSize: 12 },
  captionInput: {
    backgroundColor: "#1a1a1a", borderRadius: 10, borderWidth: 1, borderColor: "#333",
    color: "#fff", padding: 12, fontSize: 14, marginBottom: 14, minHeight: 56,
  },
  shareBtn: {
    backgroundColor: "#7B7FE8", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 8,
  },
  shareBtnDisabled: { opacity: 0.4 },
  shareBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  fullscreenOverlay: {
    flex: 1, backgroundColor: "#000",
  },
  fullscreenClose: {
    position: "absolute", top: 56, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  fullscreenCloseText: { color: "#fff", fontSize: 16 },
  fullscreenContent: { paddingTop: 100, paddingHorizontal: 20, paddingBottom: 60 },
  fullscreenHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  fullscreenPhoto: { width: "100%", height: 420, borderRadius: 12, marginBottom: 20 },
  fullscreenIconGrid: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
    gap: 12, marginBottom: 20, paddingVertical: 12,
  },
  fullscreenIconCard: {
    width: 130, height: 160,
    backgroundColor: "#1a1a1a", borderRadius: 12,
    borderWidth: 1, borderColor: "#2a2a2a",
    alignItems: "center", justifyContent: "center",
    paddingVertical: 12, paddingHorizontal: 8, gap: 8,
  },
  fullscreenIconItem: { alignItems: "center", gap: 4, width: 90 },
  fullscreenIconBg: { backgroundColor: "#2e2e3a", borderRadius: 10, padding: 10, alignItems: "center", justifyContent: "center" },
  fullscreenItemPhoto: { width: 80, height: 80, borderRadius: 6 },
  fullscreenIconName: { color: "#ddd", fontSize: 12, textAlign: "center", fontWeight: "500" },
  fullscreenIconColour: { color: "#666", fontSize: 11, textAlign: "center" },
  fullscreenCaption: { color: "#ccc", fontSize: 20, lineHeight: 24, marginBottom: 20 },
  likeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeHeart: { fontSize: 20, color: "#555" },
  likeHeartActive: { color: "#e05c7a" },
  likeCount: { color: "#888", fontSize: 13 },
  likersLink: { color: "#7B7FE8", fontSize: 12 },
  likersModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center" },
  likersModalBox: {
    backgroundColor: "#111", borderRadius: 16, padding: 20, width: "80%",
    borderWidth: 1, borderColor: "#222",
  },
  likersModalTitle: { color: "#fff", fontWeight: "bold", fontSize: 16, marginBottom: 14 },
  likersModalName: { color: "#ccc", fontSize: 14, paddingVertical: 6, borderBottomWidth: 1, borderColor: "#1e1e1e" },
  likersModalEmpty: { color: "#555", fontSize: 14, textAlign: "center" },
  likersModalClose: { color: "#7B7FE8", fontSize: 14, textAlign: "center", marginTop: 16 },
  clothingDetailBox: {
    backgroundColor: "#111", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
  },
  clothingIconLarge: { alignSelf: "center", padding: 20, borderRadius: 16, backgroundColor: "#2e2e3a", marginBottom: 4 },
  clothingDetailPhoto: { width: 120, height: 120, borderRadius: 8 },
  clothingDetailName: { color: "#fff", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  clothingDetailRows: { gap: 0 },
  clothingDetailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderColor: "#1e1e1e",
  },
  clothingDetailLabel: { color: "#555", fontSize: 14 },
  clothingDetailValue: { color: "#ddd", fontSize: 14, fontWeight: "500" },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakBadge: { backgroundColor: "#1a0f00", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "#ff6b0055" },
  streakBadgeText: { color: "#ff6b00", fontSize: 11, fontWeight: "600" },
  badgeShareCard: {
    backgroundColor: "#1a1a2e", borderRadius: 12, padding: 20, marginBottom: 8,
    alignItems: "center", borderWidth: 1, borderColor: "#7B7FE855",
  },
  badgeShareEmoji: { fontSize: 40, marginBottom: 8 },
  badgeShareTitle: { color: "#7B7FE8", fontSize: 16, fontWeight: "bold", textAlign: "center" },
  fullscreenBadgeCard: {
    backgroundColor: "#1a1a2e", borderRadius: 16, padding: 32, marginBottom: 20,
    alignItems: "center", borderWidth: 1, borderColor: "#7B7FE855",
  },
  fullscreenBadgeEmoji: { fontSize: 64, marginBottom: 12 },
  fullscreenBadgeTitle: { color: "#7B7FE8", fontSize: 20, fontWeight: "bold", textAlign: "center" },
  fullscreenBadgeTap: { color: "#555", fontSize: 12, marginTop: 8 },
  fullscreenBadgeImage: { width: 96, height: 96, marginBottom: 12 },
  badgeShareImage: { width: 56, height: 56, marginBottom: 8 },
  badgeDetailOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  badgeDetailBox: { backgroundColor: "#18182e", borderRadius: 24, padding: 32, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "#7B7FE888" },
  badgeDetailEmoji: { fontSize: 56, marginBottom: 12 },
  badgeDetailTitle: { color: "#7B7FE8", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  badgeDetailCategory: { color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  badgeDetailDivider: { width: "100%", height: 1, backgroundColor: "#222", marginBottom: 16 },
  badgeDetailDesc: { color: "#ccc", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  badgeDetailClose: { color: "#7B7FE8", fontSize: 15, fontWeight: "600" },
  communityItemGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 },
  communityItemCard: { backgroundColor: "#111", borderRadius: 16, padding: 12, width: "48%", marginBottom: 12, borderWidth: 1, borderColor: "#222" },
  communityItemImageBox: { backgroundColor: "#2e2e3a", borderRadius: 12, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  communityItemPhoto: { width: "100%", height: "100%", borderRadius: 12 },
  communityItemName: { fontSize: 14, fontWeight: "bold", color: "#fff", marginBottom: 2 },
  communityItemBrand: { fontSize: 12, color: "#7B7FE8", marginBottom: 2 },
  communityItemDetail: { fontSize: 12, color: "#888" },
  itemChipPhoto: { width: 18, height: 18, borderRadius: 3 },
});