import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseConfig";

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  colour: string;
  material: string;
  price: number;
  wear_count: number;
  image_url: string;
};

export default function Wardrobe() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [form, setForm] = useState({
    name: "",
    category: "Tops",
    colour: "",
    material: "",
    price: "",
  });

  const categories = ["All", "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"];

  const fetchItems = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { data, error } = await supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.uid)
      .order("created_at", { ascending: false });
    if (error) Alert.alert("Error", error.message);
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

 const handleAddItem = async () => {
    const user = auth.currentUser;
    console.log("Current user:", user?.uid);
    if (!user) {
      Alert.alert("Error", "Not logged in");
      return;
    }
    if (!form.name || !form.colour) {
      Alert.alert("Error", "Please fill in name and colour");
      return;
    }
    const { data, error } = await supabase.from("clothing_items").insert({
      user_id: user.uid,
      name: form.name,
      category: form.category,
      colour: form.colour,
      material: form.material,
      price: parseFloat(form.price) || 0,
    }).select();
    console.log("Insert result:", data, error);
    if (error) Alert.alert("Error", error.message);
    else {
      setModalVisible(false);
      setForm({ name: "", category: "Tops", colour: "", material: "", price: "" });
      fetchItems();
    }
  };

  const filteredItems = selectedCategory === "All"
    ? items
    : items.filter(item => item.category === selectedCategory);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Wardrobe</Text>
        <View style={styles.headerRight}>
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/profile")}>
                <Text style={styles.profileText}>👤</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items Grid */}
      <ScrollView style={styles.grid}>
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
                  <Text style={styles.itemEmoji}>👕</Text>
                </View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetail}>{item.colour} · {item.category}</Text>
                <Text style={styles.itemWears}>{item.wear_count}× worn</Text>
                {item.price > 0 && (
                  <Text style={styles.itemCPW}>
                    ${item.wear_count > 0 ? (item.price / item.wear_count).toFixed(2) : item.price.toFixed(2)}/wear
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Clothing Item</Text>

            <TextInput style={styles.input} placeholder="Name (e.g. White Tee)" placeholderTextColor="#888" value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
            <TextInput style={styles.input} placeholder="Colour (e.g. White)" placeholderTextColor="#888" value={form.colour} onChangeText={t => setForm({ ...form, colour: t })} />
            <TextInput style={styles.input} placeholder="Material (e.g. Cotton)" placeholderTextColor="#888" value={form.material} onChangeText={t => setForm({ ...form, material: t })} />
            <TextInput style={styles.input} placeholder="Price (e.g. 29.90)" placeholderTextColor="#888" value={form.price} onChangeText={t => setForm({ ...form, price: t })} keyboardType="numeric" />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {["Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, form.category === cat && styles.filterChipActive]}
                  onPress={() => setForm({ ...form, category: cat })}
                >
                  <Text style={[styles.filterChipText, form.category === cat && styles.filterChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddItem}>
              <Text style={styles.submitButtonText}>Add to Wardrobe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  addButton: { backgroundColor: "#7B7FE8", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  filterRow: { marginBottom: 24, flexGrow: 0 },
  filterChip: { backgroundColor: "#111", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: "#222" },
  filterChipActive: { backgroundColor: "#7B7FE8", borderColor: "#7B7FE8" },
  filterChipText: { color: "#888", fontSize: 13 },
  filterChipTextActive: { color: "#fff" },
  grid: { flex: 1 },
  itemsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  itemCard: { backgroundColor: "#111", borderRadius: 16, padding: 16, width: "48%", marginBottom: 16, borderWidth: 1, borderColor: "#222" },
  itemImagePlaceholder: { backgroundColor: "#222", borderRadius: 12, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  itemEmoji: { fontSize: 40 },
  itemName: { fontSize: 14, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  itemDetail: { fontSize: 12, color: "#888", marginBottom: 4 },
  itemWears: { fontSize: 12, color: "#7B7FE8" },
  itemCPW: { fontSize: 12, color: "#888", marginTop: 2 },
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#fff", fontSize: 16, marginBottom: 8 },
  emptySubtext: { color: "#888", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  input: { backgroundColor: "#1a1a1a", color: "#fff", padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: "#222" },
  label: { color: "#888", fontSize: 13, marginBottom: 8 },
  categoryRow: { marginBottom: 20, flexGrow: 0 },
  submitButton: { backgroundColor: "#7B7FE8", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  submitButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelButton: { alignItems: "center", padding: 12 },
  cancelButtonText: { color: "#888", fontSize: 14 },
  backText: { color: "#7B7FE8", fontSize: 16 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  profileButton: { backgroundColor: "#111", padding: 8, borderRadius: 20, borderWidth: 1, borderColor: "#222" },
  profileText: { fontSize: 20 },
});