import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";

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
  image_url: string;
};

const subcategories: Record<string, string[]> = {
  Tops: ["Round Neck", "Polo", "Henley", "Button Up", "Hoodie", "Tank Top", "Crewneck"],
  Bottoms: ["Skinny Jeans", "Straight Cut", "Carpenter", "Shorts", "Chinos", "Sweatpants", "Cargo"],
  Outerwear: ["Jacket", "Coat", "Blazer", "Windbreaker", "Puffer"],
  Footwear: ["Sneakers", "Boots", "Loafers", "Sandals", "Dress Shoes"],
  Accessories: ["Hat", "Belt", "Bag", "Watch", "Sunglasses", "Scarf"],
};

const categoryEmojis: Record<string, string> = {
  Tops: "👕",
  Bottoms: "👖",
  Outerwear: "🧥",
  Footwear: "👟",
  Accessories: "🧢",
};

export default function Wardrobe() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "Tops",
    subcategory: "",
    colour: "",
    material: "",
    brand: "",
    price: "",
  });

  const categories = ["All", "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"];

  const fetchItems = async () => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .eq("user_id", user.uid)
        .order("created_at", { ascending: false });
      if (error) Alert.alert("Error", error.message);
      else setItems(data || []);
      setLoading(false);
    });
    return unsubscribe;
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "Not logged in");
      return;
    }
    if (!form.name || !form.colour) {
      Alert.alert("Error", "Please fill in name and colour");
      return;
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
    }).select();
    if (error) Alert.alert("Error", error.message);
    else {
      setModalVisible(false);
      setForm({ name: "", category: "Tops", subcategory: "", colour: "", material: "", brand: "", price: "" });
      fetchItems();
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;
    if (!form.name || !form.colour) {
      Alert.alert("Error", "Please fill in name and colour");
      return;
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
      })
      .eq("id", selectedItem.id);
    if (error) Alert.alert("Error", error.message);
    else {
      setEditModalVisible(false);
      setSelectedItem(null);
      fetchItems();
    }
  };

  const handleDeleteItem = async (item: ClothingItem) => {
    const confirmed = window.confirm(`Delete ${item.name}? This cannot be undone.`);
    if (confirmed) {
      const { error } = await supabase
        .from("clothing_items")
        .delete()
        .eq("id", item.id);
      if (error) Alert.alert("Error", error.message);
      else fetchItems();
    }
  };

  const openEditModal = (item: ClothingItem) => {
    setSelectedItem(item);
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

  const filteredItems = selectedCategory === "All"
    ? items
    : items.filter(item => item.category === selectedCategory);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Wardrobe</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/(tabs)/profile")}>
            <Text style={styles.profileText}>👤</Text>
          </TouchableOpacity>
        </View>
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
                  <Text style={styles.itemEmoji}>{categoryEmojis[item.category] || "👕"}</Text>
                </View>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.brand ? <Text style={styles.itemBrand}>{item.brand}</Text> : null}
                <Text style={styles.itemDetail}>{item.colour}{item.subcategory ? ` · ${item.subcategory}` : ""}</Text>
                <Text style={styles.itemWears}>{item.wear_count}× worn</Text>
                {item.price > 0 && (
                  <Text style={styles.itemCPW}>
                    ${item.wear_count > 0 ? (item.price / item.wear_count).toFixed(2) : item.price.toFixed(2)}/wear
                  </Text>
                )}
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
            <TextInput style={styles.input} placeholder="Name (e.g. White Tee)" placeholderTextColor="#888" value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
            <TextInput style={styles.input} placeholder="Colour (e.g. White)" placeholderTextColor="#888" value={form.colour} onChangeText={t => setForm({ ...form, colour: t })} />
            <TextInput style={styles.input} placeholder="Material (e.g. Cotton)" placeholderTextColor="#888" value={form.material} onChangeText={t => setForm({ ...form, material: t })} />
            <TextInput style={styles.input} placeholder="Price (e.g. 29.90)" placeholderTextColor="#888" value={form.price} onChangeText={t => setForm({ ...form, price: t })} keyboardType="numeric" />
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {["Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"].map(cat => (
                <TouchableOpacity key={cat} style={[styles.filterChip, form.category === cat && styles.filterChipActive]} onPress={() => setForm(f => ({ ...f, category: cat, subcategory: "" }))}>
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
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Clothing Item</Text>
            <TextInput style={styles.input} placeholder="Name (e.g. White Tee)" placeholderTextColor="#888" value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
            <TextInput style={styles.input} placeholder="Brand (e.g. Uniqlo)" placeholderTextColor="#888" value={form.brand} onChangeText={t => setForm(f => ({ ...f, brand: t }))} />
            <TextInput style={styles.input} placeholder="Colour (e.g. White)" placeholderTextColor="#888" value={form.colour} onChangeText={t => setForm(f => ({ ...f, colour: t }))} />
            <TextInput style={styles.input} placeholder="Material (e.g. Cotton)" placeholderTextColor="#888" value={form.material} onChangeText={t => setForm(f => ({ ...f, material: t }))} />
            <TextInput style={styles.input} placeholder="Price (e.g. 29.90)" placeholderTextColor="#888" value={form.price} onChangeText={t => setForm(f => ({ ...f, price: t }))} keyboardType="numeric" />
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {["Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"].map(cat => (
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
            <TouchableOpacity style={styles.submitButton} onPress={handleEditItem}>
              <Text style={styles.submitButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
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
  itemImagePlaceholder: { backgroundColor: "#222", borderRadius: 12, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  itemEmoji: { fontSize: 40 },
  itemName: { fontSize: 14, fontWeight: "bold", color: "#fff", marginBottom: 2 },
  itemBrand: { fontSize: 12, color: "#7B7FE8", marginBottom: 2 },
  itemDetail: { fontSize: 12, color: "#888", marginBottom: 4 },
  itemWears: { fontSize: 12, color: "#7B7FE8" },
  itemCPW: { fontSize: 12, color: "#888", marginTop: 2 },
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
  submitButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelButton: { alignItems: "center", padding: 12, marginBottom: 24 },
  cancelButtonText: { color: "#888", fontSize: 14 },
});
