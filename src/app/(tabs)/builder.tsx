import { Image } from "expo-image";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ClothingIcon from "../../components/ClothingIcon";
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
  image_url: string | null;
  created_at: string;
};

type OutfitSlots = {
  top: ClothingItem | null;
  bottom: ClothingItem | null;
  footwear: ClothingItem | null;
  outerwear: ClothingItem | null;
  accessory: ClothingItem | null;
};

type Weather = {
  temp: string;
  description: string;
  emoji: string;
  city: string;
};

type Occasion = "Casual" | "Office" | "Formal" | "Outdoor" | "Date Night";

const OCCASION_RULES: Record<Occasion, Record<string, string[] | null>> = {
  Casual: {
    Tops: [], Bottoms: [], Dress: [], Footwear: [], Outerwear: [], Accessories: [],
  },
  Office: {
    Tops: ["Button Up", "Polo", "Blouse", "Henley", "Crewneck"],
    Bottoms: ["Straight Cut", "Skinny Jeans", "Chinos", "Midi Skirt", "Pleated Skirt", "A-Line Skirt"],
    Dress: ["Midi Dress", "Wrap Dress", "Shirt Dress", "A-Line Dress"],
    Footwear: ["Loafers", "Dress Shoes", "Boots"],
    Outerwear: ["Blazer", "Coat", "Cardigan"],
    Accessories: [],
  },
  Formal: {
    Tops: ["Button Up", "Blouse", "Bustier", "Corset"],
    Bottoms: ["Straight Cut", "Chinos", "Midi Skirt", "Maxi Skirt", "Pleated Skirt", "A-Line Skirt"],
    Dress: ["Midi Dress", "Maxi Dress", "Cocktail Dress", "Slip Dress", "A-Line Dress", "Bodycon Dress"],
    Footwear: ["Dress Shoes", "Loafers", "Boots"],
    Outerwear: ["Blazer", "Coat"],
    Accessories: [],
  },
  Outdoor: {
    Tops: ["Round Neck", "Henley", "Tank Top", "Jersey", "Hoodie", "Crewneck"],
    Bottoms: ["Shorts", "Cargo", "Straight Cut", "Baggy Jeans", "Trackpants", "Sweatpants"],
    Dress: ["Sundress", "Mini Dress"],
    Footwear: ["Sneakers", "Boots", "Sandals"],
    Outerwear: ["Jacket", "Windbreaker", "Puffer", "Hoodie", "Quarterzip"],
    Accessories: [],
  },
  "Date Night": {
    Tops: ["Off-Shoulder", "Crop Top", "Blouse", "Bustier", "Corset", "Halter Top", "Tube Top", "Button Up"],
    Bottoms: ["Skinny Jeans", "Straight Cut", "Mini Skirt", "Midi Skirt", "Wrap Skirt"],
    Dress: ["Mini Dress", "Midi Dress", "Slip Dress", "Wrap Dress", "Bodycon Dress", "Cocktail Dress"],
    Footwear: ["Boots", "Dress Shoes", "Loafers", "Sandals"],
    Outerwear: ["Blazer", "Coat", "Bomber", "Cardigan"],
    Accessories: [],
  },
};

function applyWeatherFilter(wardrobe: ClothingItem[], temp: number): ClothingItem[] {
  return wardrobe.filter(item => {
    const sub = item.subcategory?.toLowerCase() ?? "";
    const cat = item.category;
    if (temp > 28) {
      if (cat === "Outerwear" && ["jacket","coat","puffer","blazer","windbreaker"].some(s => sub.includes(s))) return false;
      if (cat === "Bottoms" && ["sweatpants","trackpants"].some(s => sub.includes(s))) return false;
      if (cat === "Tops" && ["hoodie","crewneck"].some(s => sub.includes(s))) return false;
    }
    if (temp >= 22 && temp <= 28) {
      if (cat === "Outerwear" && ["coat","puffer"].some(s => sub.includes(s))) return false;
    }
    if (temp < 18) {
      if (cat === "Footwear" && sub.includes("sandal")) return false;
      if (cat === "Bottoms" && sub.includes("shorts")) return false;
      if (cat === "Dress" && ["mini dress","sundress","slip dress"].some(s => sub.toLowerCase().includes(s))) return false;
    }
    if (temp < 10) {
      if (cat === "Tops" && ["tank top","tube top","crop top","halter top","off-shoulder","bustier","corset"].some(s => sub.includes(s))) return false;
      if (cat === "Dress") return false;
    }
    return true;
  });
}

function applyOccasionFilter(wardrobe: ClothingItem[], occasion: Occasion): ClothingItem[] {
  return wardrobe.filter(item => {
    const rules = OCCASION_RULES[occasion];
    const allowed = rules[item.category];
    if (allowed === undefined) return true;
    if (allowed === null) return false;
    if (allowed.length === 0) return true;
    return allowed.includes(item.subcategory);
  });
}

const NEUTRALS = new Set([
  "white","black","grey","gray","beige","cream","ivory","off-white",
  "navy","tan","brown","khaki","camel","stone","taupe","charcoal",
  "off white","light grey","dark grey","light gray","dark gray",
]);

const COLOUR_FAMILIES: string[][] = [
  ["red","burgundy","maroon","wine","crimson","rust"],
  ["blue","cobalt","royal blue","sky blue","powder blue","denim"],
  ["green","olive","forest","sage","mint","emerald","hunter green"],
  ["pink","blush","rose","hot pink","mauve","fuchsia"],
  ["purple","lavender","lilac","violet","plum"],
  ["orange","terracotta","burnt orange","peach","coral"],
  ["yellow","mustard","gold","lemon"],
];

function isNeutral(colour: string): boolean {
  return NEUTRALS.has(colour.toLowerCase().trim());
}

function getColourFamily(colour: string): number {
  const c = colour.toLowerCase().trim();
  for (let i = 0; i < COLOUR_FAMILIES.length; i++) {
    if (COLOUR_FAMILIES[i].some(f => c.includes(f) || f.includes(c))) return i;
  }
  return -1;
}

function coloursCompatible(a: string, b: string): boolean {
  if (!a || !b) return true;
  if (isNeutral(a) || isNeutral(b)) return true;
  const familyA = getColourFamily(a);
  const familyB = getColourFamily(b);
  if (familyA === -1 || familyB === -1) return false;
  return familyA === familyB;
}

function outfitIsHarmonious(slots: Partial<OutfitSlots>): boolean {
  const colours = [
    slots.top?.colour, slots.bottom?.colour, slots.footwear?.colour,
    slots.outerwear?.colour, slots.accessory?.colour,
  ].filter((c): c is string => !!c);
  for (let i = 0; i < colours.length; i++)
    for (let j = i + 1; j < colours.length; j++)
      if (!coloursCompatible(colours[i], colours[j])) return false;
  return true;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function itemsForCat(wardrobe: ClothingItem[], category: string): ClothingItem[] {
  return wardrobe.filter(i => i.category === category);
}

function scoreOutfit(slots: OutfitSlots): number {
  const items = [slots.top, slots.bottom, slots.footwear, slots.outerwear, slots.accessory]
    .filter(Boolean) as ClothingItem[];
  return items.reduce((acc, item) => acc + Math.max(0, 10 - item.wear_count), 0) + Math.random() * 5;
}

function slotsAreIdentical(a: OutfitSlots, b: OutfitSlots, locked: Set<keyof OutfitSlots>): boolean {
  const keys: (keyof OutfitSlots)[] = ["top", "bottom", "footwear", "outerwear", "accessory"];
  return keys.filter(k => !locked.has(k)).every(k => a[k]?.id === b[k]?.id);
}

function generateOutfit(
  wardrobe: ClothingItem[],
  attempts = 200,
  lockedSlots: Partial<OutfitSlots> = {},
  excludeOutfit?: OutfitSlots | null
): OutfitSlots | null {
  const dresses     = itemsForCat(wardrobe, "Dress");
  const tops        = itemsForCat(wardrobe, "Tops");
  const bottoms     = itemsForCat(wardrobe, "Bottoms");
  const footwears   = itemsForCat(wardrobe, "Footwear");
  const outerwears  = itemsForCat(wardrobe, "Outerwear");
  const accessories = itemsForCat(wardrobe, "Accessories");

  const useDress = dresses.length > 0 && (tops.length === 0 || Math.random() < 0.5);
  const topPool       = lockedSlots.top       ? [lockedSlots.top]       : shuffleArr(useDress ? dresses : tops);
  const bottomPool    = lockedSlots.bottom    ? [lockedSlots.bottom]    : (useDress ? [] : shuffleArr(bottoms));
  const footwearPool  = lockedSlots.footwear  ? [lockedSlots.footwear]  : shuffleArr(footwears);
  const outerwearPool = lockedSlots.outerwear ? [lockedSlots.outerwear] : shuffleArr(outerwears);
  const accessoryPool = lockedSlots.accessory ? [lockedSlots.accessory] : shuffleArr(accessories);

  if (topPool.length === 0) return null;
  if (!useDress && bottomPool.length === 0) return null;

  let best: OutfitSlots | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < attempts; i++) {
    const candidate: OutfitSlots = {
      top:       topPool[i % topPool.length],
      bottom:    useDress ? null : bottomPool[i % bottomPool.length],
      footwear:  footwearPool.length  > 0 ? footwearPool[i  % footwearPool.length]  : null,
      outerwear: outerwearPool.length > 0 ? outerwearPool[i % outerwearPool.length] : null,
      accessory: accessoryPool.length > 0 ? accessoryPool[i % accessoryPool.length] : null,
    };
    if (!outfitIsHarmonious(candidate)) continue;
    if (excludeOutfit && slotsAreIdentical(candidate, excludeOutfit, new Set(Object.keys(lockedSlots) as (keyof OutfitSlots)[]))) continue;
    const score = scoreOutfit(candidate);
    if (score > bestScore) { bestScore = score; best = candidate; }
  }

  if (!best) best = {
    top: topPool[0],
    bottom: useDress ? null : (bottomPool[0] ?? null),
    footwear: footwearPool[0] ?? null,
    outerwear: outerwearPool[0] ?? null,
    accessory: accessoryPool[0] ?? null,
  };

  return best;
}

const OCCASIONS: Occasion[] = ["Casual", "Office", "Formal", "Outdoor", "Date Night"];

const SLOT_CATEGORIES: Record<string, string[]> = {
  top: ["Tops", "Dress"],
  bottom: ["Bottoms"],
  footwear: ["Footwear"],
  outerwear: ["Outerwear"],
  accessory: ["Accessories"],
};

function SlotCard({
  label, emoji, item, hasItems, onPress, isDressSlot = false, disabled = false,
}: {
  label: string; emoji: string; item: ClothingItem | null;
  hasItems: boolean; onPress: () => void; isDressSlot?: boolean; disabled?: boolean;
}) {
  const displayLabel = isDressSlot ? "Dress" : label;
  return (
    <TouchableOpacity
      style={[styles.slotCard, !item && styles.slotCardEmpty]}
      onPress={onPress}
      disabled={!hasItems || disabled}
    >
      <View style={styles.slotImageBox}>
        {item ? (
          item.image_url
            ? <Image source={{ uri: item.image_url }} style={styles.slotPhoto} contentFit="contain" />
            : <ClothingIcon category={item.category} subcategory={item.subcategory} colour={item.colour} size={56} />
        ) : (
          <Text style={styles.slotEmptyEmoji}>{emoji}</Text>
        )}
      </View>
      <View style={styles.slotInfo}>
        <Text style={styles.slotLabel}>{displayLabel}</Text>
        {item ? (
          <>
            <Text style={styles.slotItemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.slotItemDetail} numberOfLines={1}>
              {item.colour}{item.subcategory ? ` · ${item.subcategory}` : ""}
            </Text>
            {item.brand ? <Text style={styles.slotItemBrand} numberOfLines={1}>{item.brand}</Text> : null}
            {isDressSlot && <Text style={styles.dressTag}>👗 Covers top & bottom</Text>}
          </>
        ) : (
          <Text style={styles.slotEmptyText}>{hasItems ? "Tap to select" : "No items"}</Text>
        )}
      </View>
      {hasItems && !disabled && (
        <Text style={styles.slotChevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

function PickerModal({
  visible, title, items, selectedId, onSelect, onClear, onClose,
}: {
  visible: boolean;
  title: string;
  items: ClothingItem[];
  selectedId: string | null;
  onSelect: (item: ClothingItem) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedId && (
            <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearBtnText}>Remove from outfit</Text>
            </TouchableOpacity>
          )}
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <Text style={styles.pickerEmpty}>No items available for this occasion & weather.</Text>
            ) : (
              items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pickerRow, selectedId === item.id && styles.pickerRowSelected]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <View style={styles.pickerImageBox}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={styles.pickerPhoto} contentFit="contain" />
                      : <ClothingIcon category={item.category} subcategory={item.subcategory} colour={item.colour} size={44} />
                    }
                  </View>
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.pickerItemDetail} numberOfLines={1}>
                      {item.colour}{item.subcategory ? ` · ${item.subcategory}` : ""}
                    </Text>
                    {item.brand ? <Text style={styles.pickerItemBrand} numberOfLines={1}>{item.brand}</Text> : null}
                  </View>
                  {selectedId === item.id && <Text style={styles.pickerTick}>✓</Text>}
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function Builder() {
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [outfit, setOutfit] = useState<OutfitSlots>({
    top: null, bottom: null, footwear: null, outerwear: null, accessory: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [occasion, setOccasion] = useState<Occasion>("Casual");
  const [generating, setGenerating] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<keyof OutfitSlots | null>(null);
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [rawTempC, setRawTempC] = useState<number | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setWeather({ temp: "--", description: "Location unavailable", emoji: "🌤️", city: "Unknown" });
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        const city = geocode[0]?.city || geocode[0]?.region || "Unknown";
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`
        );
        const data = await response.json();
        const tempC = Math.round(data.current.temperature_2m);
        const code = data.current.weathercode;
        const getWeatherInfo = (code: number) => {
          if (code === 0) return { description: "Clear skies", emoji: "☀️" };
          if (code <= 3) return { description: "Partly cloudy", emoji: "⛅" };
          if (code <= 48) return { description: "Foggy", emoji: "🌫️" };
          if (code <= 67) return { description: "Rainy", emoji: "🌧️" };
          if (code <= 77) return { description: "Snowy", emoji: "❄️" };
          if (code <= 82) return { description: "Showers", emoji: "🌦️" };
          return { description: "Stormy", emoji: "⛈️" };
        };
        const { description, emoji } = getWeatherInfo(code);
        setRawTempC(tempC);
        const displayTemp = tempUnit === "F" ? Math.round(tempC * 9 / 5 + 32) : tempC;
        setWeather({ temp: displayTemp.toString(), description, emoji, city });
      } catch {
        setWeather({ temp: "--", description: "Unavailable", emoji: "🌤️", city: "Unknown" });
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, []);

  useEffect(() => {
    if (rawTempC === null) return;
    const displayTemp = tempUnit === "F" ? Math.round(rawTempC * 9 / 5 + 32) : rawTempC;
    setWeather(prev => prev ? { ...prev, temp: displayTemp.toString() } : prev);
  }, [tempUnit, rawTempC]);

  const fetchWardrobe = async () => {
    setLoading(true);
    const user = await new Promise<any>((resolve) => {
      const unsub = auth.onAuthStateChanged((u) => { unsub(); resolve(u); });
    });
    if (!user) { setLoading(false); return; }
    const today = new Date().toISOString().split("T")[0];
    const [{ data: wardrobeData, error }, { data: logData }] = await Promise.all([
      supabase.from("clothing_items").select("*").eq("user_id", user.uid),
      supabase
        .from("outfit_logs")
        .select("id, outfit_log_items(clothing_item_id)")
        .eq("user_id", user.uid)
        .eq("date", today)
        .maybeSingle(),
    ]);
    if (error) console.error("Wardrobe fetch error:", error.message);
    else setWardrobe(wardrobeData || []);
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("temperature_unit")
      .eq("firebase_uid", user.uid)
      .single();
    const unit: "C" | "F" = settingsData?.temperature_unit ?? "C";
    setTempUnit(unit);
    if (logData) {
      setSavedOutfitId(logData.id);
      const loggedIds = (logData.outfit_log_items || []).map((i: any) => i.clothing_item_id);
      const loggedItems = (wardrobeData || []).filter((i: any) => loggedIds.includes(i.id));
      const rebuilt: OutfitSlots = { top: null, bottom: null, footwear: null, outerwear: null, accessory: null };
      loggedItems.forEach((item: ClothingItem) => {
        if (item.category === "Tops" && !rebuilt.top) rebuilt.top = item;
        else if (item.category === "Dress" && !rebuilt.top) rebuilt.top = item;
        else if (item.category === "Bottoms") rebuilt.bottom = item;
        else if (item.category === "Footwear") rebuilt.footwear = item;
        else if (item.category === "Outerwear") rebuilt.outerwear = item;
        else if (item.category === "Accessories") rebuilt.accessory = item;
      });
      setOutfit(rebuilt);
    } else {
      setSavedOutfitId(null);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchWardrobe();
    }, [])
  );

  const getFilteredWardrobe = () => {
    const temp = rawTempC !== null ? rawTempC : 22;
    let filtered = applyWeatherFilter(wardrobe, temp);
    filtered = applyOccasionFilter(filtered, occasion);
    const hasTop = filtered.some(i => i.category === "Tops" || i.category === "Dress");
    const hasBottom = filtered.some(i => i.category === "Bottoms" || i.category === "Dress");
    if (!hasTop || !hasBottom) return wardrobe;
    return filtered;
  };

  const getPickerItems = (slot: keyof OutfitSlots): ClothingItem[] => {
    const filtered = getFilteredWardrobe();
    const categories = SLOT_CATEGORIES[slot];
    return filtered.filter(i => categories.includes(i.category));
  };

  const handleSelectItem = (slot: keyof OutfitSlots, item: ClothingItem) => {
    const isDress = item.category === "Dress";
    if (slot === "top" && isDress) {
      setOutfit(prev => ({ ...prev, top: item, bottom: null }));
    } else if (slot === "top" && !isDress && outfit.top?.category === "Dress") {
      setOutfit(prev => ({ ...prev, top: item, bottom: null }));
    } else {
      setOutfit(prev => ({ ...prev, [slot]: item }));
    }
  };

  const handleClearSlot = (slot: keyof OutfitSlots) => {
    if (slot === "top") {
      setOutfit(prev => ({ ...prev, top: null, bottom: null }));
    } else {
      setOutfit(prev => ({ ...prev, [slot]: null }));
    }
    setPickerSlot(null);
  };

  const handleGenerate = () => {
    if (savedOutfitId) return;
    setGenerating(true);
    setTimeout(() => {
      const filtered = getFilteredWardrobe();
      const result = generateOutfit(filtered, 300, {}, outfit);
      if (result) setOutfit(result);
      setGenerating(false);
    }, 50);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) { Alert.alert("Error", "Not logged in"); return; }
    const items = [outfit.top, outfit.bottom, outfit.footwear, outfit.outerwear, outfit.accessory]
      .filter((i): i is ClothingItem => i !== null);
    if (items.length === 0) { Alert.alert("No items", "Add at least one item to your outfit first."); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: logData, error: logError } = await supabase
        .from("outfit_logs").insert({ user_id: user.uid, date: today }).select().single();
      if (logError) throw logError;
      const { error: itemsError } = await supabase
        .from("outfit_log_items")
        .insert(items.map((item) => ({ outfit_log_id: logData.id, clothing_item_id: item.id })));
      if (itemsError) throw itemsError;
      await Promise.all(
        items.map((item) =>
          supabase.from("clothing_items").update({ wear_count: item.wear_count + 1 }).eq("id", item.id)
        )
      );
      setSavedOutfitId(logData.id);
      Alert.alert("Outfit saved! 🎉", "Logged for today and wear counts updated.");
    } catch (err: any) {
      Alert.alert("Save failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasCategory = (cat: string) => wardrobe.some((i) => i.category === cat);
  const canGenerate = (hasCategory("Tops") || hasCategory("Dress")) &&
                      (hasCategory("Bottoms") || hasCategory("Dress"));
  const isDressOutfit = outfit.top?.category === "Dress";
  const outfitItemCount = [outfit.top, outfit.bottom, outfit.footwear, outfit.outerwear, outfit.accessory].filter(Boolean).length;
  const hasAnyItem = outfitItemCount > 0;
  const isLogged = !!savedOutfitId;

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#7B7FE8" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Outfit Builder</Text>
        {hasAnyItem && (
          <Text style={styles.headerSub}>{outfitItemCount} piece{outfitItemCount !== 1 ? "s" : ""}</Text>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.weatherCard}>
          {weatherLoading ? (
            <ActivityIndicator color="#7B7FE8" size="small" />
          ) : (
            <>
              <Text style={styles.weatherEmoji}>{weather?.emoji}</Text>
              <View>
                <Text style={styles.weatherTemp}>{weather?.temp}°{tempUnit} · {weather?.city}</Text>
                <Text style={styles.weatherDesc}>{weather?.description}</Text>
              </View>
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>Occasion</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occasionRow}>
          {OCCASIONS.map((occ) => (
            <TouchableOpacity
              key={occ}
              style={[styles.occasionChip, occasion === occ && styles.occasionChipActive]}
              onPress={() => { setOccasion(occ); }}
            >
              <Text style={[styles.occasionChipText, occasion === occ && styles.occasionChipTextActive]}>
                {occ}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!canGenerate ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👗</Text>
            <Text style={styles.emptyTitle}>Add more clothes first</Text>
            <Text style={styles.emptySubtext}>
              You need at least one Top (or Dress) and one Bottom in your wardrobe to build outfits.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.slots}>
              <SlotCard
                label="Top"
                emoji="👕"
                item={outfit.top}
                hasItems={hasCategory("Tops") || hasCategory("Dress")}
                onPress={() => setPickerSlot("top")}
                isDressSlot={isDressOutfit}
                disabled={isLogged}
              />
              {!isDressOutfit && (
                <SlotCard
                  label="Bottom"
                  emoji="👖"
                  item={outfit.bottom}
                  hasItems={hasCategory("Bottoms")}
                  onPress={() => setPickerSlot("bottom")}
                  disabled={isLogged}
                />
              )}
              <SlotCard
                label="Footwear"
                emoji="👟"
                item={outfit.footwear}
                hasItems={hasCategory("Footwear")}
                onPress={() => setPickerSlot("footwear")}
                disabled={isLogged}
              />
              <SlotCard
                label="Outerwear"
                emoji="🧥"
                item={outfit.outerwear}
                hasItems={hasCategory("Outerwear")}
                onPress={() => setPickerSlot("outerwear")}
                disabled={isLogged}
              />
              <SlotCard
                label="Accessory"
                emoji="🎒"
                item={outfit.accessory}
                hasItems={hasCategory("Accessories")}
                onPress={() => setPickerSlot("accessory")}
                disabled={isLogged}
              />
            </View>

            {hasAnyItem && outfitIsHarmonious(outfit) && (
              <View style={styles.harmonyRow}>
                <Text style={styles.harmonyText}>✨ Colour-matched · {occasion} · {weather?.temp}°{tempUnit}</Text>
                <Text style={styles.harmonySubtext}>
                  {isLogged ? "Outfit logged for today" : "Tap any slot to change a piece"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.generateBtn, (generating || isLogged) && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={generating || isLogged}
            >
              {generating
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.generateBtnText}>✨ Generate Outfit</Text>
              }
            </TouchableOpacity>

            {hasAnyItem && (
              <TouchableOpacity
                style={[styles.saveBtn, (saving || isLogged) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving || isLogged}
              >
                {saving
                  ? <ActivityIndicator color="#7B7FE8" />
                  : <Text style={styles.saveBtnText}>
                      {isLogged ? "✅ Logged for today" : "📅 Log This Outfit"}
                    </Text>
                }
              </TouchableOpacity>
            )}

            {hasAnyItem && (
              <TouchableOpacity
                style={styles.clearOutfitBtn}
                onPress={async () => {
                  if (savedOutfitId) {
                    try {
                      await supabase.from("outfit_log_items").delete().eq("outfit_log_id", savedOutfitId);
                      await supabase.from("outfit_logs").delete().eq("id", savedOutfitId);
                    } catch (err: any) {
                      Alert.alert("Error", "Could not delete logged outfit.");
                      return;
                    }
                  }
                  setOutfit({ top: null, bottom: null, footwear: null, outerwear: null, accessory: null });
                  setSavedOutfitId(null);
                }}
              >
                <Text style={styles.clearOutfitBtnText}>✕ Clear Outfit</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {pickerSlot && !isLogged && (
        <PickerModal
          visible={true}
          title={
            pickerSlot === "top" ? "Select Top or Dress" :
            pickerSlot === "bottom" ? "Select Bottom" :
            pickerSlot === "footwear" ? "Select Footwear" :
            pickerSlot === "outerwear" ? "Select Outerwear" :
            "Select Accessory"
          }
          items={getPickerItems(pickerSlot)}
          selectedId={outfit[pickerSlot]?.id ?? null}
          onSelect={(item) => handleSelectItem(pickerSlot, item)}
          onClear={() => handleClearSlot(pickerSlot)}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 24 },
  centered: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 13, color: "#888" },
  scroll: { flex: 1 },
  weatherCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "#222", gap: 12 },
  weatherEmoji: { fontSize: 28 },
  weatherTemp: { fontSize: 15, fontWeight: "bold", color: "#fff" },
  weatherDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  sectionLabel: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  occasionRow: { marginBottom: 20, flexGrow: 0 },
  occasionChip: { backgroundColor: "#111", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: "#222" },
  occasionChipActive: { backgroundColor: "#7B7FE8", borderColor: "#7B7FE8" },
  occasionChipText: { color: "#888", fontSize: 13 },
  occasionChipTextActive: { color: "#fff", fontWeight: "bold" },
  slots: { gap: 12, marginBottom: 20 },
  slotCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#222", gap: 14 },
  slotCardEmpty: { opacity: 0.6 },
  slotImageBox: { width: 68, height: 68, backgroundColor: "#2e2e3a", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  slotPhoto: { width: 68, height: 68, borderRadius: 12 },
  slotEmptyEmoji: { fontSize: 28 },
  slotInfo: { flex: 1 },
  slotLabel: { fontSize: 11, color: "#888", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  slotItemName: { fontSize: 15, fontWeight: "bold", color: "#fff", marginBottom: 2 },
  slotItemDetail: { fontSize: 12, color: "#888" },
  slotItemBrand: { fontSize: 12, color: "#7B7FE8", marginTop: 2 },
  slotEmptyText: { fontSize: 13, color: "#555", fontStyle: "italic" },
  dressTag: { fontSize: 11, color: "#7B7FE8", marginTop: 3 },
  slotChevron: { fontSize: 22, color: "#555", paddingLeft: 4 },
  harmonyRow: { backgroundColor: "#0d1a0d", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#00cc4433", marginBottom: 16 },
  harmonyText: { fontSize: 13, fontWeight: "bold", color: "#00cc44" },
  harmonySubtext: { fontSize: 12, color: "#888", marginTop: 2 },
  generateBtn: { backgroundColor: "#7B7FE8", padding: 18, borderRadius: 16, alignItems: "center", marginBottom: 12 },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  saveBtn: { backgroundColor: "transparent", padding: 16, borderRadius: 16, alignItems: "center", marginBottom: 12, borderWidth: 1, borderColor: "#7B7FE8" },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#7B7FE8", fontWeight: "bold", fontSize: 16 },
  emptyCard: { backgroundColor: "#111", borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "#222", marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalClose: { fontSize: 18, color: "#888", padding: 4 },
  clearBtn: { backgroundColor: "#1a0000", borderRadius: 10, padding: 12, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#ff000033" },
  clearBtnText: { color: "#ff4444", fontSize: 14, fontWeight: "bold" },
  pickerEmpty: { color: "#888", fontSize: 14, textAlign: "center", marginTop: 24 },
  pickerRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: "#1a1a1a", gap: 12 },
  pickerRowSelected: { backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#7B7FE8" },
  pickerImageBox: { width: 56, height: 56, backgroundColor: "#2e2e3a", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pickerPhoto: { width: 56, height: 56, borderRadius: 10 },
  pickerInfo: { flex: 1 },
  pickerItemName: { fontSize: 14, fontWeight: "bold", color: "#fff", marginBottom: 2 },
  pickerItemDetail: { fontSize: 12, color: "#888" },
  pickerItemBrand: { fontSize: 12, color: "#7B7FE8", marginTop: 2 },
  pickerTick: { fontSize: 18, color: "#7B7FE8", fontWeight: "bold" },
  clearOutfitBtn: { alignItems: "center", padding: 14, marginBottom: 12 },
  clearOutfitBtnText: { color: "#ff4444", fontSize: 14, fontWeight: "bold" },
});