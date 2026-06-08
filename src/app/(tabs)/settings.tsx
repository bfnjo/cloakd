import { auth } from "@/firebaseConfig";
import { supabase } from "@/supabaseConfig";
import { router } from "expo-router";
import { EmailAuthProvider, deleteUser, onAuthStateChanged, reauthenticateWithCredential } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Settings = {
  username: string;
  temperature_unit: "C" | "F";
  currency: string;
  profile_visibility: "public" | "private";
};

const CURRENCIES = ["SGD", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "HKD", "MYR", "IDR"];

export default function Settings() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    username: "",
    temperature_unit: "C",
    currency: "SGD",
    profile_visibility: "public",
  });
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/(auth)"); return; }
      setUid(user.uid);
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("firebase_uid", user.uid)
        .single();
      if (data) {
        setSettings({
          username: data.username ?? "",
          temperature_unit: data.temperature_unit ?? "C",
          currency: data.currency ?? "SGD",
          profile_visibility: data.profile_visibility ?? "public",
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    if (!uid) return;
    if (settings.username.trim().length < 3) {
      Alert.alert("Invalid username", "Username must be at least 3 characters.");
      return;
    }

    if (Platform.OS === "web") {
      if (!window.confirm("Are you sure you want to save these settings?")) return;
      await doSave();
    } else {
      Alert.alert(
        "Save Changes",
        "Are you sure you want to save these settings?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: doSave },
        ]
      );
    }
  };

  const doSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { firebase_uid: uid, ...settings, updated_at: new Date().toISOString() },
        { onConflict: "firebase_uid" }
      );
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        Alert.alert("Username taken", "That username is already in use.");
      } else {
        Alert.alert("Error", "Failed to save settings.");
      }
    } else {
      Alert.alert("Saved", "Your settings have been updated.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!uid || !deletePassword.trim()) {
      Alert.alert("Error", "Please enter your password to confirm.");
      return;
    }
    setDeleting(true);
    try {
      const user = auth.currentUser!;
      const credential = EmailAuthProvider.credential(user.email!, deletePassword);
      await reauthenticateWithCredential(user, credential);

      await supabase.from("user_settings").delete().eq("firebase_uid", uid);
      await supabase.from("clothing_items").delete().eq("user_id", uid);
      await deleteUser(user);

      router.replace("/(auth)");
    } catch (e: any) {
      setDeleting(false);
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        Alert.alert("Wrong password", "The password you entered is incorrect.");
      } else {
        Alert.alert("Error", "Failed to delete account. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#7B7FE8" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/profile")}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={settings.username}
            onChangeText={(v) => setSettings((s) => ({ ...s, username: v }))}
            placeholder="Enter username"
            placeholderTextColor="#555"
            autoCapitalize="none"
            maxLength={30}
          />
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Temperature Unit</Text>
          <View style={styles.toggleRow}>
            {(["C", "F"] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.toggleBtn, settings.temperature_unit === unit && styles.toggleBtnActive]}
                onPress={() => setSettings((s) => ({ ...s, temperature_unit: unit }))}
              >
                <Text style={[styles.toggleText, settings.temperature_unit === unit && styles.toggleTextActive]}>
                  °{unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Currency</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowCurrencyModal(true)}>
            <Text style={styles.selectorText}>{settings.currency}</Text>
            <Text style={styles.selectorChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Profile Visibility</Text>
          <View style={styles.toggleRow}>
            {(["public", "private"] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.toggleBtn, settings.profile_visibility === v && styles.toggleBtnActive]}
                onPress={() => setSettings((s) => ({ ...s, profile_visibility: v }))}
              >
                <Text style={[styles.toggleText, settings.profile_visibility === v && styles.toggleTextActive]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helperText}>
            {settings.profile_visibility === "public"
              ? "Your outfits are visible to the community."
              : "Your outfits are only visible to you."}
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Danger Zone */}
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <View style={styles.card}>
          <TouchableOpacity onPress={() => setShowDeleteModal(true)}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Permanently deletes your account and all wardrobe data. This cannot be undone.
          </Text>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <ScrollView>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.modalOption}
                  onPress={() => { setSettings((s) => ({ ...s, currency: c })); setShowCurrencyModal(false); }}
                >
                  <Text style={[styles.modalOptionText, settings.currency === c && { color: "#7B7FE8" }]}>
                    {c}
                  </Text>
                  {settings.currency === c && <Text style={{ color: "#7B7FE8" }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCurrencyModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              This will permanently delete your account and all wardrobe data. Enter your password to confirm.
            </Text>
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Password"
              placeholderTextColor="#555"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />
            <TouchableOpacity
              style={styles.deleteConfirmBtn}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteConfirmText}>Delete My Account</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowDeleteModal(false); setDeletePassword(""); }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 24 },
  loadingContainer: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  backButton: { color: "#7B7FE8", fontSize: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  sectionLabel: { color: "#555", fontSize: 11, fontWeight: "600", letterSpacing: 1.2, marginBottom: 8, marginTop: 24 },
  card: { backgroundColor: "#111", borderRadius: 12, padding: 16, gap: 4 },
  fieldLabel: { color: "#aaa", fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: "#222" },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#1a1a1a", alignItems: "center", borderWidth: 1, borderColor: "#222" },
  toggleBtnActive: { backgroundColor: "#7B7FE8", borderColor: "#7B7FE8" },
  toggleText: { color: "#888", fontSize: 14, fontWeight: "600" },
  toggleTextActive: { color: "#fff" },
  divider: { height: 1, backgroundColor: "#1e1e1e", marginVertical: 12 },
  selector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1a1a1a", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: "#222" },
  selectorText: { color: "#fff", fontSize: 15 },
  selectorChevron: { color: "#555", fontSize: 20 },
  helperText: { color: "#555", fontSize: 12, marginTop: 8 },
  saveBtn: { backgroundColor: "#7B7FE8", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 28 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  deleteText: { color: "#e05c5c", fontSize: 15, fontWeight: "600" },
  deleteConfirmBtn: { backgroundColor: "#e05c5c", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 16 },
  deleteConfirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#111", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "70%" },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalBody: { color: "#aaa", fontSize: 14, lineHeight: 20 },
  modalOption: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1e1e1e" },
  modalOptionText: { color: "#fff", fontSize: 15 },
  modalCancel: { marginTop: 16, alignItems: "center", paddingVertical: 12 },
  modalCancelText: { color: "#7B7FE8", fontSize: 15, fontWeight: "600" },
});