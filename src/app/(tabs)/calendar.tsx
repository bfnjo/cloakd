import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "../../firebaseConfig";
import { supabase } from "../../supabaseConfig";

type OutfitLog = {
  id: string;
  date: string;
  notes: string;
  items: ClothingItem[];
};

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  colour: string;
  brand: string;
  wear_count: number;
};

export default function Calendar() {
  const [logs, setLogs] = useState<OutfitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const categoryEmojis: Record<string, string> = {
    Tops: "👕", Bottoms: "👖", Outerwear: "🧥", Footwear: "👟", Accessories: "🧢",
  };

  const fetchLogs = async () => {
    const user = await new Promise<any>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => { unsubscribe(); resolve(u); });
    });
    if (!user) return;
    const { data, error } = await supabase
      .from("outfit_logs")
      .select(`*, outfit_log_items(clothing_item_id, clothing_items(*))`)
      .eq("user_id", user.uid)
      .order("date", { ascending: false });
    if (error) Alert.alert("Error", error.message);
    else {
      const formatted = (data || []).map((log: any) => ({
        id: log.id,
        date: log.date,
        notes: log.notes,
        items: log.outfit_log_items.map((oli: any) => oli.clothing_items),
      }));
      setLogs(formatted);
    }
    setLoading(false);
  };

  const fetchWardrobe = async () => {
    const user = await new Promise<any>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => { unsubscribe(); resolve(u); });
    });
    if (!user) return;
    const { data } = await supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.uid);
    setWardrobe(data || []);
  };

  useEffect(() => {
    fetchLogs();
    fetchWardrobe();
  }, []);

  const handleLogOutfit = async () => {
    const user = await new Promise<any>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => { unsubscribe(); resolve(u); });
    });
    if (!user) return;
    if (selectedItems.length === 0) {
      Alert.alert("Error", "Please select at least one item");
      return;
    }
    const { data: logData, error: logError } = await supabase
      .from("outfit_logs")
      .insert({ user_id: user.uid, date: selectedDate, notes })
      .select()
      .single();
    if (logError) { Alert.alert("Error", logError.message); return; }
    const logItems = selectedItems.map(itemId => ({
      outfit_log_id: logData.id,
      clothing_item_id: itemId,
    }));
    const { error: itemsError } = await supabase.from("outfit_log_items").insert(logItems);
    if (itemsError) { Alert.alert("Error", itemsError.message); return; }
    for (const itemId of selectedItems) {
      const item = wardrobe.find(w => w.id === itemId);
      if (item) {
        await supabase
          .from("clothing_items")
          .update({ wear_count: item.wear_count + 1 })
          .eq("id", itemId);
      }
    }
    setModalVisible(false);
    setSelectedItems([]);
    setNotes("");
    fetchLogs();
  };

  const handleDeleteLog = async (logId: string) => {
    Alert.alert("Delete Log", "Delete this outfit log? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const { error } = await supabase.from("outfit_logs").delete().eq("id", logId);
        if (error) Alert.alert("Error", error.message);
        else fetchLogs();
      }},
    ]);
  };

  const openEditLog = (log: OutfitLog) => {
    setSelectedItems(log.items.map(i => i.id));
    setNotes(log.notes || "");
    setEditingLogId(log.id);
    setEditModalVisible(true);
  };

  const handleEditLog = async () => {
    if (!editingLogId) return;
    if (selectedItems.length === 0) {
      Alert.alert("Error", "Please select at least one item");
      return;
    }
    await supabase.from("outfit_log_items").delete().eq("outfit_log_id", editingLogId);
    const logItems = selectedItems.map(itemId => ({
      outfit_log_id: editingLogId,
      clothing_item_id: itemId,
    }));
    const { error } = await supabase.from("outfit_log_items").insert(logItems);
    if (error) { Alert.alert("Error", error.message); return; }
    await supabase.from("outfit_logs").update({ notes }).eq("id", editingLogId);
    setEditModalVisible(false);
    setSelectedItems([]);
    setNotes("");
    setEditingLogId(null);
    fetchLogs();
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const getLogForDate = (dateStr: string) => {
    return logs.find(log => log.date === dateStr);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/home")}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month - 1))}>
          <Text style={styles.monthNavArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{formatMonthYear(currentMonth)}</Text>
        <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month + 1))}>
          <Text style={styles.monthNavArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dayLabels}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <Text key={d} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const log = getLogForDate(dateStr);
          const isToday = dateStr === new Date().toISOString().split("T")[0];
          const isSelected = dateStr === selectedDate;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayCell, isToday && styles.dayCellToday, isSelected && styles.dayCellSelected]}
              onPress={() => setSelectedDate(dateStr)}
            >
              <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>{day}</Text>
              {log && <View style={styles.logDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.logsSection}>
        <Text style={styles.sectionTitle}>
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Text>
        {(() => {
          const log = getLogForDate(selectedDate);
          if (!log) return (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No outfit logged.</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={styles.logLink}>+ Log today's outfit</Text>
              </TouchableOpacity>
            </View>
          );
          return (
            <View style={styles.logCard}>
              <View style={styles.logItems}>
                {log.items.map(item => (
                  <View key={item.id} style={styles.logItem}>
                    <Text style={styles.logItemEmoji}>{categoryEmojis[item.category] || "👕"}</Text>
                    <View>
                      <Text style={styles.logItemName}>{item.name}</Text>
                      <Text style={styles.logItemDetail}>{item.colour} · {item.category}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
              <View style={styles.logActions}>
                <TouchableOpacity style={styles.editButton} onPress={() => openEditLog(log)}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteLog(log.id)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </ScrollView>

      {/* Log Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Outfit</Text>
            <Text style={styles.modalDate}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <Text style={styles.label}>Select items worn:</Text>
            <ScrollView style={styles.itemsList}>
              {wardrobe.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, selectedItems.includes(item.id) && styles.itemRowSelected]}
                  onPress={() => toggleItem(item.id)}
                >
                  <Text style={styles.itemRowEmoji}>{categoryEmojis[item.category] || "👕"}</Text>
                  <View style={styles.itemRowInfo}>
                    <Text style={styles.itemRowName}>{item.name}</Text>
                    <Text style={styles.itemRowDetail}>{item.colour} · {item.category}</Text>
                  </View>
                  {selectedItems.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.submitButton} onPress={handleLogOutfit}>
              <Text style={styles.submitButtonText}>Log Outfit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setModalVisible(false); setSelectedItems([]); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Outfit Log</Text>
            <Text style={styles.label}>Select items worn:</Text>
            <ScrollView style={styles.itemsList}>
              {wardrobe.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, selectedItems.includes(item.id) && styles.itemRowSelected]}
                  onPress={() => toggleItem(item.id)}
                >
                  <Text style={styles.itemRowEmoji}>{categoryEmojis[item.category] || "👕"}</Text>
                  <View style={styles.itemRowInfo}>
                    <Text style={styles.itemRowName}>{item.name}</Text>
                    <Text style={styles.itemRowDetail}>{item.colour} · {item.category}</Text>
                  </View>
                  {selectedItems.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.submitButton} onPress={handleEditLog}>
              <Text style={styles.submitButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditModalVisible(false); setSelectedItems([]); }}>
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
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  backText: { color: "#7B7FE8", fontSize: 16 },
  addButton: { backgroundColor: "#7B7FE8", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  monthNavArrow: { color: "#7B7FE8", fontSize: 20, paddingHorizontal: 8 },
  monthText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  dayLabels: { flexDirection: "row", marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: "center", color: "#888", fontSize: 12 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24 },
  dayCell: { width: "14.28%", height: 48, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  dayCellToday: { backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#7B7FE8" },
  dayCellSelected: { backgroundColor: "#7B7FE8" },
  dayNumber: { color: "#fff", fontSize: 13 },
  dayNumberToday: { color: "#7B7FE8", fontWeight: "bold" },
  logDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#7B7FE8", marginTop: 2 },
  logsSection: { flex: 1 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 16 },
  emptyState: { alignItems: "center", paddingVertical: 24 },
  emptyText: { color: "#888", fontSize: 14, marginBottom: 8 },
  logLink: { color: "#7B7FE8", fontSize: 14 },
  logCard: { backgroundColor: "#111", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#222" },
  logItems: { gap: 12 },
  logItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  logItemEmoji: { fontSize: 24 },
  logItemName: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  logItemDetail: { color: "#888", fontSize: 12 },
  logNotes: { color: "#888", fontSize: 13, marginTop: 12, fontStyle: "italic" },
  logActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  editButton: { flex: 1, backgroundColor: "#1a1a2e", padding: 8, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#7B7FE8" },
  editButtonText: { color: "#7B7FE8", fontSize: 12, fontWeight: "bold" },
  deleteButton: { flex: 1, backgroundColor: "#1a0000", padding: 8, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#ff000033" },
  deleteButtonText: { color: "#ff4444", fontSize: 12, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  modalDate: { color: "#888", fontSize: 13, marginBottom: 16 },
  label: { color: "#888", fontSize: 13, marginBottom: 8 },
  itemsList: { maxHeight: 300, marginBottom: 16 },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#222" },
  itemRowSelected: { borderColor: "#7B7FE8", backgroundColor: "#1a1a2e" },
  itemRowEmoji: { fontSize: 24, marginRight: 12 },
  itemRowInfo: { flex: 1 },
  itemRowName: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  itemRowDetail: { color: "#888", fontSize: 12 },
  checkmark: { color: "#7B7FE8", fontSize: 18, fontWeight: "bold" },
  submitButton: { backgroundColor: "#7B7FE8", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  submitButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelButton: { alignItems: "center", padding: 12 },
  cancelButtonText: { color: "#888", fontSize: 14 },
});