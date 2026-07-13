import { FileSystemUploadType, uploadAsync } from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import ClothingIcon from "../../components/ClothingIcon";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";
import { removeBackground } from "../../utils/backgroundRemoval";

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  colour: string;
  material: string;
  brand: string;
  price: number;
  wear_count: number;
  image_url: string | null;
  created_at: string;
};

const subcategories: Record<string, string[]> = {
  Tops: ["Round Neck", "Polo", "Henley", "Button Up", "Hoodie", "Tank Top", "Crewneck", "Jersey", "Tube Top", "Halter Top", "Blouse", "Crop Top", "Off-Shoulder", "Bustier", "Corset"],
  Bottoms: ["Skinny Jeans", "Straight Cut", "Baggy Jeans", "Carpenter", "Shorts", "Chinos", "Sweatpants", "Cargo", "Trackpants", "Mini Skirt", "Midi Skirt", "Maxi Skirt", "A-Line Skirt", "Pleated Skirt", "Wrap Skirt"],
  Outerwear: ["Jacket", "Coat", "Blazer", "Windbreaker", "Puffer", "Hoodie", "Quarterzip", "Bomber", "Cardigan", "Overshirt", "Sweater"],
  Dress: ["Mini Dress", "Midi Dress", "Maxi Dress", "Slip Dress", "Wrap Dress", "Shirt Dress", "Bodycon Dress", "A-Line Dress", "Sundress", "Cocktail Dress"],
  Footwear: ["Sneakers", "Boots", "Loafers", "Sandals", "Dress Shoes"],
  Accessories: ["Hat", "Belt", "Bag", "Watch", "Sunglasses", "Scarf", "Ring", "Necklace", "Bracelet", "Earrings"],
};

function FunnelIcon({ color = "#888", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M2 3 L18 3 L12 11 L12 17 L8 17 L8 11 Z" fill={color} />
    </Svg>
  );
}

// ─── Forgotten Pieces Section ────────────────────────────────────────────────
// Displays clothing items not worn in 30+ days.
// onItemPress is intentionally optional — wire it up when the outfit builder
// is ready to accept pre-filled items (e.g. navigate to builder with item id).

type ForgottenPiecesSectionProps = {
  items: ClothingItem[];
  lastWornMap: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
  onItemPress?: (item: ClothingItem) => void;
};

function ForgottenPiecesSection({ items, lastWornMap, expanded, onToggle, onItemPress }: ForgottenPiecesSectionProps) {
  if (items.length === 0) return null;
  return (
    <View style={styles.rediscoverCard}>
      <TouchableOpacity style={styles.rediscoverHeader} onPress={onToggle}>
        <View>
          <Text style={styles.rediscoverTitle}>😴 Forgotten Pieces</Text>
          <Text style={styles.rediscoverSub}>
            {items.length} item{items.length !== 1 ? "s" : ""} not worn in 30+ days
          </Text>
        </View>
        <Text style={styles.rediscoverChevron}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rediscoverScroll}>
          {items.map(item => {
            const Wrapper = onItemPress ? TouchableOpacity : View;
            return (
              <Wrapper
                key={item.id}
                style={styles.rediscoverItem}
                {...(onItemPress ? { onPress: () => onItemPress(item) } : {})}
              >
                <View style={styles.rediscoverIconWrapper}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.rediscoverPhoto} contentFit="contain" />
                  ) : (
                    <ClothingIcon category={item.category} subcategory={item.subcategory} colour={item.colour} size={48} />
                  )}
                </View>
                <Text style={styles.rediscoverItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rediscoverItemSub} numberOfLines={1}>
                  {lastWornMap[item.id]
                    ? `Last: ${new Date(lastWornMap[item.id] + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "Never worn"}
                </Text>
              </Wrapper>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default function Wardrobe() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [lastWornMap, setLastWornMap] = useState<Record<string, string>>({});
  const [rediscoverExpanded, setRediscoverExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedColour, setSelectedColour] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "most_worn" | "least_worn" | "cpw_low" | "cpw_high">("newest");
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "Tops",
    subcategory: "",
    colour: "",
    material: "",
    brand: "",
    price: "",
  });

  const categories = ["All", "Tops", "Bottoms", "Outerwear", "Dress", "Footwear", "Accessories"];

  const fetchItems = async () => {
    const user = await new Promise<any>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        unsubscribe();
        resolve(u);
      });
    });
    if (!user) return;

    const [{ data, error }, { data: logsData }] = await Promise.all([
      supabase
        .from("clothing_items")
        .select("*")
        .eq("user_id", user.uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("outfit_logs")
        .select("date, outfit_log_items(clothing_item_id)")
        .eq("user_id", user.uid)
        .order("date", { ascending: false }),
    ]);

    if (error) { console.log("Fetch error:", error.message); return; }

    // Build last-worn map: item id → most recent wear date string
    const wornMap: Record<string, string> = {};
    (logsData || []).forEach((log: any) => {
      (log.outfit_log_items || []).forEach((oli: any) => {
        if (!wornMap[oli.clothing_item_id]) {
          wornMap[oli.clothing_item_id] = log.date;
        }
      });
    });

    setLastWornMap(wornMap);
    setItems(data || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [])
  );

  // ── Image capture ────────────────────────────────────────────────────────────

  async function pickImage(source: "camera" | "library") {
    const permResult = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      Alert.alert("Permission required", `Please allow ${source === "camera" ? "camera" : "photo library"} access in settings.`);
      return;
    }

    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });

    if (!result.canceled && result.assets[0]) {
      setPendingImageUri(result.assets[0].uri);
    }
  }

  async function uploadImage(localUri: string, userId: string): Promise<string | null> {
    try {
      setUploadingImage(true);
      const processedUri = await removeBackground(localUri);
      const fileName = `${userId}_${Date.now()}.png`;

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const uploadResult = await uploadAsync(
        `${supabaseUrl}/storage/v1/object/clothing-images/${fileName}`,
        processedUri,
        {
          httpMethod: "POST",
          uploadType: FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "image/png",
            "x-upsert": "true",
          },
        }
      );

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Upload failed (${uploadResult.status}): ${uploadResult.body}`);
      }

      const { data: urlData } = supabase.storage
        .from("clothing-images")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err: any) {
      Alert.alert("Image upload failed", err.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  const handleAddItem = async () => {
    const user = auth.currentUser;
    if (!user) { Alert.alert("Error", "Not logged in"); return; }
    if (!form.name || !form.colour) { Alert.alert("Error", "Please fill in name and colour"); return; }

    let imageUrl: string | null = null;
    if (pendingImageUri) {
      imageUrl = await uploadImage(pendingImageUri, user.uid);
    }

    const { error } = await supabase.from("clothing_items").insert({
      user_id: user.uid,
      name: form.name,
      category: form.category,
      subcategory: form.subcategory,
      colour: form.colour,
      material: form.material,
      brand: form.brand,
      price: parseFloat(form.price) || 0,
      image_url: imageUrl,
    }).select();

    if (error) Alert.alert("Error", error.message);
    else {
      setModalVisible(false);
      setPendingImageUri(null);
      setForm({ name: "", category: "Tops", subcategory: "", colour: "", material: "", brand: "", price: "" });
      fetchItems();
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;
    const user = auth.currentUser;
    if (!user) return;
    if (!form.name || !form.colour) { Alert.alert("Error", "Please fill in name and colour"); return; }

    let imageUrl = selectedItem.image_url;
    if (pendingImageUri) {
      imageUrl = await uploadImage(pendingImageUri, user.uid);
    }

    const { error } = await supabase
      .from("clothing_items")
      .update({
        name: form.name,
        category: form.category,
        subcategory: form.subcategory,
        colour: form.colour,
        material: form.material,
        brand: form.brand,
        price: parseFloat(form.price) || 0,
        image_url: imageUrl,
      })
      .eq("id", selectedItem.id);

    if (error) Alert.alert("Error", error.message);
    else {
      setEditModalVisible(false);
      setPendingImageUri(null);
      setSelectedItem(null);
      fetchItems();
    }
  };

  const handleDeleteItem = (item: ClothingItem) => {
    Alert.alert(
      "Delete item",
      `Delete ${item.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("clothing_items").delete().eq("id", item.id);
            if (error) Alert.alert("Error", error.message);
            else fetchItems();
          },
        },
      ]
    );
  };

  const openEditModal = (item: ClothingItem) => {
    setSelectedItem(item);
    setPendingImageUri(null);
    setForm({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory || "",
      colour: item.colour,
      material: item.material || "",
      brand: item.brand || "",
      price: item.price?.toString() || "",
    });
    setEditModalVisible(true);
  };

  const availableColours = Array.from(new Set(items.map(i => i.colour).filter(Boolean))).sort();
  const hasActiveFilters = selectedColour !== null || sortBy !== "newest";

  const filteredItems = items
    .filter(item => selectedCategory === "All" || item.category === selectedCategory)
    .filter(item => selectedColour === null || item.colour.toLowerCase() === selectedColour.toLowerCase())
    .sort((a, b) => {
      if (sortBy === "most_worn") return b.wear_count - a.wear_count;
      if (sortBy === "least_worn") return a.wear_count - b.wear_count;
      if (sortBy === "cpw_low") {
        const cpwA = a.wear_count > 0 ? a.price / a.wear_count : a.price;
        const cpwB = b.wear_count > 0 ? b.price / b.wear_count : b.price;
        return cpwA - cpwB;
      }
      if (sortBy === "cpw_high") {
        const cpwA = a.wear_count > 0 ? a.price / a.wear_count : a.price;
        const cpwB = b.wear_count > 0 ? b.price / b.wear_count : b.price;
        return cpwB - cpwA;
      }
      // newest (default): already ordered by created_at desc from DB
      return 0;
    });

  // 30-day rediscovery: items not worn in the last 30 days or never worn
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const forgottenItems = items.filter(item => {
    const lastWorn = lastWornMap[item.id];
    if (!lastWorn) return true;
    return new Date(lastWorn + "T00:00:00") < thirtyDaysAgo;
  });

  const getCPWColour = (cpw: number) => {
    if (cpw < 1) return { color: "#00cc44", background: "#0a2a0a", border: "#00ff0033" };
    if (cpw < 5) return { color: "#ffaa00", background: "#2a1a00", border: "#ffaa0033" };
    return { color: "#ff4444", background: "#1a0000", border: "#ff000033" };
  };

  // ── Image picker UI (shared between add & edit modals) ────────────────────

  const ImagePickerSection = ({ existingUrl }: { existingUrl?: string | null }) => {
    const preview = pendingImageUri || existingUrl;
    return (
      <View style={styles.imageSection}>
        <Text style={styles.label}>Photo (optional)</Text>
        {preview ? (
          <View style={styles.imagePreviewWrapper}>
            <Image
              source={{ uri: preview }}
              style={styles.imagePreview}
              contentFit="contain"
            />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => setPendingImageUri(null)}
            >
              <Text style={styles.removeImageText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage("camera")}>
              <Text style={styles.imageBtnIcon}>📷</Text>
              <Text style={styles.imageBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage("library")}>
              <Text style={styles.imageBtnIcon}>🖼️</Text>
              <Text style={styles.imageBtnText}>Library</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Item card image/icon ───────────────────────────────────────────────────

  const ItemImage = ({ item }: { item: ClothingItem }) => {
    if (item.image_url) {
      return (
        <Image
          source={{ uri: item.image_url }}
          style={styles.itemPhoto}
          contentFit="contain"
        />
      );
    }
    return (
      <ClothingIcon
        category={item.category}
        subcategory={item.subcategory}
        colour={item.colour}
        size={70}
      />
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Wardrobe</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setForm({ name: "", category: "Tops", subcategory: "", colour: "", material: "", brand: "", price: "" });
            setPendingImageUri(null);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.grid}>
        {/* ── Filter & Sort pill ── */}
        <TouchableOpacity
          style={[styles.filterPill, hasActiveFilters && styles.filterPillActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <FunnelIcon color={hasActiveFilters ? "#7B7FE8" : "#888"} size={15} />
          <Text style={[styles.filterPillText, hasActiveFilters && styles.filterPillTextActive]}>
            {(() => {
              const parts: string[] = [];
              if (sortBy !== "newest") parts.push({ most_worn: "Most Worn", least_worn: "Least Worn", cpw_low: "CPW ↑ Low", cpw_high: "CPW ↓ High" }[sortBy]);
              if (selectedColour) parts.push(selectedColour);
              return parts.length > 0 ? parts.join(" · ") : "Filter & Sort";
            })()}
          </Text>
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>

        {/* ── 30-day rediscovery nudge ── */}
        <ForgottenPiecesSection
          items={forgottenItems}
          lastWornMap={lastWornMap}
          expanded={rediscoverExpanded}
          onToggle={() => setRediscoverExpanded(e => !e)}
          // Future: pass onItemPress to connect forgotten pieces to the outfit builder.
          // e.g. onItemPress={(item) => router.push({ pathname: "/(tabs)/builder", params: { prefillItemId: item.id } })}
        />

        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items yet.</Text>
            <Text style={styles.emptySubtext}>Tap "+ Add" to add your first item!</Text>
          </View>
        ) : (
          <View style={styles.itemsGrid}>
            {filteredItems.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemImagePlaceholder}>
                  <ItemImage item={item} />
                </View>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.brand ? <Text style={styles.itemBrand}>{item.brand}</Text> : null}
                <Text style={styles.itemDetail}>{item.colour}{item.subcategory ? ` · ${item.subcategory}` : ""}</Text>
                <Text style={styles.itemWears}>{item.wear_count}× worn</Text>
                {item.price > 0 && (() => {
                  const cpw = item.wear_count > 0 ? item.price / item.wear_count : item.price;
                  const colours = getCPWColour(cpw);
                  return (
                    <View style={[styles.cpwBadge, { backgroundColor: colours.background, borderColor: colours.border }]}>
                      <Text style={[styles.cpwBadgeText, { color: colours.color }]}>
                        ${cpw.toFixed(2)}/wear
                      </Text>
                    </View>
                  );
                })()}
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteItem(item)}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Clothing Item</Text>
            <ImagePickerSection />
            <TextInput style={styles.input} placeholder="Name (e.g. White Tee)" placeholderTextColor="#888" value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
            <TextInput style={styles.input} placeholder="Colour (e.g. White)" placeholderTextColor="#888" value={form.colour} onChangeText={t => setForm({ ...form, colour: t })} />
            <TextInput style={styles.input} placeholder="Brand (e.g. Uniqlo)" placeholderTextColor="#888" value={form.brand} onChangeText={t => setForm({ ...form, brand: t })} />
            <TextInput style={styles.input} placeholder="Material (e.g. Cotton)" placeholderTextColor="#888" value={form.material} onChangeText={t => setForm({ ...form, material: t })} />
            <TextInput style={styles.input} placeholder="Price (e.g. 29.90)" placeholderTextColor="#888" value={form.price} onChangeText={t => setForm({ ...form, price: t })} keyboardType="numeric" />
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {["Tops", "Bottoms", "Outerwear", "Dress", "Footwear", "Accessories"].map(cat => (
                <TouchableOpacity key={cat} style={[styles.filterChip, form.category === cat && styles.filterChipActive]} onPress={() => setForm(f => ({ ...f, category: cat, subcategory: "" }))}>
                  <Text style={[styles.filterChipText, form.category === cat && styles.filterChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {subcategories[form.category] && (
              <>
                <Text style={styles.label}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  {subcategories[form.category].map(sub => (
                    <TouchableOpacity key={sub} style={[styles.filterChip, form.subcategory === sub && styles.filterChipActive]} onPress={() => setForm(f => ({ ...f, subcategory: sub }))}>
                      <Text style={[styles.filterChipText, form.subcategory === sub && styles.filterChipTextActive]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={[styles.submitButton, uploadingImage && styles.submitButtonDisabled]} onPress={handleAddItem} disabled={uploadingImage}>
              {uploadingImage
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitButtonText}>Add to Wardrobe</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setModalVisible(false); setPendingImageUri(null); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Filter & Sort Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={() => { setSelectedColour(null); setSortBy("newest"); }}>
                  <Text style={styles.clearFiltersText}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>Sort by</Text>
            <View style={styles.sortGrid}>
              {([
                { key: "newest",    label: "Newest" },
                { key: "most_worn", label: "Most Worn" },
                { key: "least_worn",label: "Least Worn" },
                { key: "cpw_low",   label: "CPW ↑ Low" },
                { key: "cpw_high",  label: "CPW ↓ High" },
              ] as const).map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterChip, sortBy === opt.key && styles.filterChipActive]}
                  onPress={() => setSortBy(opt.key)}
                >
                  <Text style={[styles.filterChipText, sortBy === opt.key && styles.filterChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {availableColours.length > 0 && (
              <>
                <Text style={styles.label}>Colour</Text>
                <View style={styles.sortGrid}>
                  {availableColours.map(colour => (
                    <TouchableOpacity
                      key={colour}
                      style={[styles.filterChip, selectedColour === colour && styles.filterChipActive]}
                      onPress={() => setSelectedColour(selectedColour === colour ? null : colour)}
                    >
                      <Text style={[styles.filterChipText, selectedColour === colour && styles.filterChipTextActive]}>{colour}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.submitButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.submitButtonText}>
                Apply · {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Clothing Item</Text>
            <ImagePickerSection existingUrl={selectedItem?.image_url} />
            <TextInput style={styles.input} placeholder="Name (e.g. White Tee)" placeholderTextColor="#888" value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
            <TextInput style={styles.input} placeholder="Brand (e.g. Uniqlo)" placeholderTextColor="#888" value={form.brand} onChangeText={t => setForm(f => ({ ...f, brand: t }))} />
            <TextInput style={styles.input} placeholder="Colour (e.g. White)" placeholderTextColor="#888" value={form.colour} onChangeText={t => setForm(f => ({ ...f, colour: t }))} />
            <TextInput style={styles.input} placeholder="Material (e.g. Cotton)" placeholderTextColor="#888" value={form.material} onChangeText={t => setForm(f => ({ ...f, material: t }))} />
            <TextInput style={styles.input} placeholder="Price (e.g. 29.90)" placeholderTextColor="#888" value={form.price} onChangeText={t => setForm(f => ({ ...f, price: t }))} keyboardType="numeric" />
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {["Tops", "Bottoms", "Outerwear", "Dress", "Footwear", "Accessories"].map(cat => (
                <TouchableOpacity key={cat} style={[styles.filterChip, form.category === cat && styles.filterChipActive]} onPress={() => setForm(f => ({ ...f, category: cat, subcategory: "" }))}>
                  <Text style={[styles.filterChipText, form.category === cat && styles.filterChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {subcategories[form.category] && (
              <>
                <Text style={styles.label}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  {subcategories[form.category].map(sub => (
                    <TouchableOpacity key={sub} style={[styles.filterChip, form.subcategory === sub && styles.filterChipActive]} onPress={() => setForm(f => ({ ...f, subcategory: sub }))}>
                      <Text style={[styles.filterChipText, form.subcategory === sub && styles.filterChipTextActive]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={[styles.submitButton, uploadingImage && styles.submitButtonDisabled]} onPress={handleEditItem} disabled={uploadingImage}>
              {uploadingImage
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitButtonText}>Save Changes</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditModalVisible(false); setPendingImageUri(null); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  backText: { color: "#7B7FE8", fontSize: 16 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  addButton: { backgroundColor: "#7B7FE8", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  profileButton: { backgroundColor: "#111", padding: 8, borderRadius: 20, borderWidth: 1, borderColor: "#222" },
  profileText: { fontSize: 20 },
  filterRow: { marginBottom: 24, flexGrow: 0 },
  filterChip: { backgroundColor: "#111", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: "#222" },
  filterChipActive: { backgroundColor: "#7B7FE8", borderColor: "#7B7FE8" },
  filterChipText: { color: "#888", fontSize: 13 },
  filterChipTextActive: { color: "#fff" },
  grid: { flex: 1 },
  itemsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  itemCard: { backgroundColor: "#111", borderRadius: 16, padding: 16, width: "48%", marginBottom: 16, borderWidth: 1, borderColor: "#222" },
  itemImagePlaceholder: { backgroundColor: "#2e2e3a", borderRadius: 12, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  itemPhoto: { width: "100%", height: "100%", borderRadius: 12 },
  itemName: { fontSize: 14, fontWeight: "bold", color: "#fff", marginBottom: 2 },
  itemBrand: { fontSize: 12, color: "#7B7FE8", marginBottom: 2 },
  itemDetail: { fontSize: 12, color: "#888", marginBottom: 4 },
  itemWears: { fontSize: 12, color: "#7B7FE8" },
  itemActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  editButton: { flex: 1, backgroundColor: "#1a1a2e", padding: 8, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#7B7FE8" },
  editButtonText: { color: "#7B7FE8", fontSize: 12, fontWeight: "bold" },
  deleteButton: { flex: 1, backgroundColor: "#1a0000", padding: 8, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#ff000033" },
  deleteButtonText: { color: "#ff4444", fontSize: 12, fontWeight: "bold" },
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#fff", fontSize: 16, marginBottom: 8 },
  emptySubtext: { color: "#888", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  input: { backgroundColor: "#1a1a1a", color: "#fff", padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: "#222" },
  label: { color: "#888", fontSize: 13, marginBottom: 8, marginTop: 4 },
  chipRow: { marginBottom: 16, flexGrow: 0 },
  submitButton: { backgroundColor: "#7B7FE8", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12, marginTop: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelButton: { alignItems: "center", padding: 12, marginBottom: 24 },
  cancelButtonText: { color: "#888", fontSize: 14 },
  cpwBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, marginTop: 4, alignSelf: "flex-start" },
  cpwBadgeText: { fontSize: 11, fontWeight: "bold" },
  // Image picker
  imageSection: { marginBottom: 16 },
  imageButtons: { flexDirection: "row", gap: 12 },
  imageBtn: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "#333", padding: 14, alignItems: "center", gap: 6 },
  imageBtnIcon: { fontSize: 24 },
  imageBtnText: { color: "#aaa", fontSize: 13 },
  imagePreviewWrapper: { alignItems: "center", gap: 8 },
  imagePreview: { width: "100%", height: 160, borderRadius: 12, backgroundColor: "#1a1a1a" },
  removeImageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#1a0000", borderWidth: 1, borderColor: "#ff000033" },
  removeImageText: { color: "#ff4444", fontSize: 12 },
  imageHint: { color: "#555", fontSize: 11, marginTop: 6, textAlign: "center" },
  filterPill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#111", borderRadius: 24, paddingHorizontal: 18, paddingVertical: 10, marginBottom: 16, borderWidth: 1, borderColor: "#333", gap: 8 },
  filterPillActive: { borderColor: "#7B7FE8", backgroundColor: "#1a1a2e" },
  filterPillText: { fontSize: 14, color: "#888", fontWeight: "600" },
  filterPillTextActive: { color: "#7B7FE8" },
  filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#7B7FE8" },
  // Filter modal
  filterModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  clearFiltersText: { color: "#7B7FE8", fontSize: 14 },
  sortGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  // Rediscovery nudge
  rediscoverCard: { backgroundColor: "#1a1200", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#ffaa0044" },
  rediscoverHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  rediscoverTitle: { fontSize: 14, fontWeight: "bold", color: "#ffaa00" },
  rediscoverSub: { fontSize: 12, color: "#888", marginTop: 2 },
  rediscoverChevron: { color: "#ffaa00", fontSize: 14 },
  rediscoverScroll: { marginTop: 14 },
  rediscoverItem: { alignItems: "center", marginRight: 16, width: 72 },
  rediscoverIconWrapper: { backgroundColor: "#2a1f00", borderRadius: 12, width: 68, height: 68, alignItems: "center", justifyContent: "center", marginBottom: 6, borderWidth: 1, borderColor: "#ffaa0033" },
  rediscoverPhoto: { width: 64, height: 64, borderRadius: 10 },
  rediscoverItemName: { fontSize: 11, color: "#fff", textAlign: "center", fontWeight: "600" },
  rediscoverItemSub: { fontSize: 10, color: "#888", textAlign: "center", marginTop: 2 },
});
