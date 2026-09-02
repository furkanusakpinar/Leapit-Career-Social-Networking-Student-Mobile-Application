import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSelector } from "react-redux";
import { db } from "../../firebaseConfig";
import { darkTheme, lightTheme } from "../theme/colors";
import BottomSheet from "../components/BottomSheet";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const formatTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return `${seconds}sn`;
  if (minutes < 60) return `${minutes}dk`;
  if (hours < 24) return `${hours}sa`;
  if (days < 7) return `${days}gun`;
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
};

const getNotifMeta = (type) => {
  switch (type) {
    case "newPost":      return { title: "Yeni Paylasim",         icon: "post",              color: "#2ECC71" };
    case "like":         return { title: "Begeni",                 icon: "heart",             color: "#E74C3C" };
    case "follow":       return { title: "Yeni Takipci",           icon: "account-plus",      color: "#3498DB" };
    case "jobApproved":  return { title: "Ilaniniz Onaylandi",    icon: "briefcase-check",   color: "#10B981" };
    case "jobRejected":  return { title: "Ilaniniz Reddedildi",   icon: "briefcase-remove",  color: "#EF4444" };
    default:             return { title: "Yeni Bildirim",          icon: "bell-ring-outline", color: "#007AFF" };
  }
};

function NotifSheet({ notification, visible, onClose, colors }) {
  if (!notification) return null;
  const meta = getNotifMeta(notification.type);
  const ss = getSheetStyles(colors);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={meta.title}>
      <View style={ss.sheetTop}>
        <View style={[ss.iconCircle, { backgroundColor: meta.color + "20" }]}>
          <MaterialCommunityIcons name={meta.icon} size={34} color={meta.color} />
        </View>
        <Text style={[ss.sheetTime, { color: colors.textSub }]}>{notification.timeStr}</Text>
      </View>
      <View style={[ss.msgBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[ss.msgText, { color: colors.textMain }]}>{notification.content}</Text>
      </View>
      <TouchableOpacity style={[ss.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
        <Text style={ss.closeBtnText}>Kapat</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

function PendingConnectionCard({ request, colors, onAccept, onReject, actionLoading }) {
  const navigation = useNavigation();
  const isLoading = actionLoading === request.id;

  return (
    <TouchableOpacity
      style={[pcStyles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      activeOpacity={0.9}
      onPress={() => navigation.navigate("OtherProfilePage", { userId: request.senderUserId })}
    >
      <View style={pcStyles.bannerContainer}>
        {request.senderBackBannerUrl ? (
          <Image source={{ uri: request.senderBackBannerUrl }} style={pcStyles.banner} resizeMode="cover" />
        ) : (
          <View style={[pcStyles.bannerPlaceholder, { backgroundColor: colors.primary + "22" }]} />
        )}
        <View style={pcStyles.bannerOverlay} />
      </View>

      <View style={pcStyles.avatarRow}>
        <Image
          source={request.senderProfileImageUrl
            ? { uri: request.senderProfileImageUrl }
            : require("../../assets/images/ProfileSquare.png")}
          style={[pcStyles.avatar, { borderColor: colors.cardBackground }]}
        />
      </View>

      <View style={pcStyles.infoSection}>
        <View style={pcStyles.infoLeft}>
          <Text style={[pcStyles.name, { color: colors.textMain }]} numberOfLines={1}>
            {request.senderUserName || "Isimsiz"}
          </Text>
          {!!request.senderUserJob && (
            <View style={pcStyles.infoRow}>
              <MaterialCommunityIcons name="briefcase-outline" size={12} color={colors.textSub} style={{ marginRight: 4 }} />
              <Text style={[pcStyles.infoText, { color: colors.textSub }]} numberOfLines={1}>{request.senderUserJob}</Text>
            </View>
          )}
          {!!request.senderSchool && (
            <View style={pcStyles.infoRow}>
              <MaterialCommunityIcons name="school-outline" size={12} color={colors.textSub} style={{ marginRight: 4 }} />
              <Text style={[pcStyles.infoText, { color: colors.textSub }]} numberOfLines={1}>{request.senderSchool}</Text>
            </View>
          )}
          {!!request.senderLocation && (
            <View style={pcStyles.infoRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color={colors.textSub} style={{ marginRight: 4 }} />
              <Text style={[pcStyles.infoText, { color: colors.textSub }]} numberOfLines={1}>{request.senderLocation}</Text>
            </View>
          )}
          <Text style={[pcStyles.timeText, { color: colors.textSub }]}>{request.timeStr}</Text>
        </View>

        <View style={pcStyles.actionButtons}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={[pcStyles.acceptBtn, { backgroundColor: colors.primary }]}
                onPress={() => onAccept(request)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="check" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[pcStyles.rejectBtn, { borderColor: colors.border }]}
                onPress={() => onReject(request)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsPage() {
  const navigation  = useNavigation();
  const userId      = useSelector(state => state.user.userId);
  const themeMode   = useSelector(state => state.theme?.mode || "light");
  const isDark      = themeMode === "dark";
  const colors      = isDark ? darkTheme : lightTheme;
  const styles      = getStyles(colors);

  const [activeTab, setActiveTab] = useState("bildirimler");
  const [notifications, setNotifications]     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedNotif, setSelectedNotif]     = useState(null);
  const [sheetVisible, setSheetVisible]       = useState(false);
  const [menuVisible, setMenuVisible]         = useState(false);
  const menuBtnRef                            = useRef(null);
  const [menuPos, setMenuPos]                 = useState({ top: 0, right: 16 });
  const [selectionMode, setSelectionMode]     = useState(false);
  const [selectedIds, setSelectedIds]         = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingPending, setLoadingPending]   = useState(false);
  const [actionLoading, setActionLoading]     = useState(null);

  const unsubRef = useRef(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    if (unsubRef.current) unsubRef.current();

    const q = query(
      collection(db, "Users", userId, "notifications"),
      orderBy("createdAt", "desc")
    );

    unsubRef.current = onSnapshot(q, (snap) => {
      const batch = writeBatch(db);
      let hasUnread = false;
      const fetched = snap.docs.map(d => {
        const data = d.data();
        if (isFocused && !data.isRead) {
          hasUnread = true;
          batch.update(doc(db, "Users", userId, "notifications", d.id), { isRead: true });
        }
        const rawDate = data.createdAt?.toDate?.() ?? new Date();
        return {
          id:      d.id,
          type:    data.type || "",
          content: data.content || "Detayli bilgi icin tiklayin.",
          isRead:  isFocused ? true : (data.isRead || false),
          timeStr: formatTime(rawDate),
          rawDate,
          sourceUserId: data.sourceUserId || null,
        };
      });
      if (hasUnread) batch.commit().catch(err => console.error(err));
      setNotifications(fetched);
      setLoading(false);
    });

    return () => unsubRef.current?.();
  }, [userId, isFocused]);

  const fetchPendingRequests = useCallback(async () => {
    if (!userId) return;
    setLoadingPending(true);
    try {
      const q = query(
        collection(db, "connectionRequests"),
        where("receiverUserId", "==", userId),
        where("status", "==", "pending")
      );
      const snapshot = await getDocs(q);
      const requests = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let senderExtra = {};
        try {
          const senderDoc = await getDoc(doc(db, "Users", data.senderUserId));
          if (senderDoc.exists()) {
            const sd = senderDoc.data();
            senderExtra = {
              senderBackBannerUrl: sd.backProfileImageUrl || null,
              senderSchool: sd.school || null,
              senderLocation: sd.userLocation || null,
            };
          }
        } catch (_) {}
        const rawDate = data.timestamp?.toDate?.() ?? new Date();
        requests.push({
          id: docSnap.id,
          senderUserId: data.senderUserId,
          senderUserName: data.senderUserName || "Bilinmiyor",
          senderUserJob: data.senderUserJob || null,
          senderProfileImageUrl: data.senderProfileImageUrl || null,
          ...senderExtra,
          timeStr: formatTime(rawDate),
          rawDate,
        });
      }
      requests.sort((a, b) => b.rawDate - a.rawDate);
      setPendingRequests(requests);
    } catch (error) {
      console.error("Bekleyen bağlantı istekleri yuklenemedi:", error);
    } finally {
      setLoadingPending(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === "bağlantılar") fetchPendingRequests();
  }, [activeTab, fetchPendingRequests]);

  const handleAccept = async (request) => {
    setActionLoading(request.id);
    try {
      await updateDoc(doc(db, "connectionRequests", request.id), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
      });
      await setDoc(doc(collection(db, "Users", request.senderUserId, "notifications")), {
        type: "connectionAccepted",
        content: "Bağlantı isteğiniz kabul edildi.",
        isRead: false,
        createdAt: serverTimestamp(),
        sourceUserId: userId,
      });
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error("bağlantı istegi kabul edilirken hata:", error);
      Alert.alert("Hata", "Istek kabul edilirken bir sorun olustu.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (request) => {
    Alert.alert(
      "Istegi Reddet",
      `${request.senderUserName} adli kisinin bağlantı istegi reddedilsin mi?`,
      [
        { text: "Iptal", style: "cancel" },
        {
          text: "Reddet",
          style: "destructive",
          onPress: async () => {
            setActionLoading(request.id);
            try {
              await updateDoc(doc(db, "connectionRequests", request.id), {
                status: "rejected",
                rejectedAt: serverTimestamp(),
              });
              setPendingRequests(prev => prev.filter(r => r.id !== request.id));
            } catch (error) {
              console.error("bağlantı istegi reddedilirken hata:", error);
              Alert.alert("Hata", "Istek reddedilirken bir sorun olustu.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handlePress = async (item) => {
    if (selectionMode) { toggleSelect(item.id); return; }
    if (!item.isRead) await updateDoc(doc(db, "Users", userId, "notifications", item.id), { isRead: true });
    if (item.type === "follow" && item.sourceUserId) {
      navigation.navigate("OtherProfilePage", { userId: item.sourceUserId });
    } else {
      setSelectedNotif(item);
      setSheetVisible(true);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.delete(doc(db, "Users", userId, "notifications", id)));
    await batch.commit();
    exitSelection();
  };

  const deleteAll = () => {
    setMenuVisible(false);
    Alert.alert("Tumunu Sil", "Tum bildirimler silinsin mi?", [
      { text: "Iptal", style: "cancel" },
      {
        text: "Evet, Sil", style: "destructive",
        onPress: async () => {
          const batch = writeBatch(db);
          notifications.forEach(n => batch.delete(doc(db, "Users", userId, "notifications", n.id)));
          await batch.commit();
        },
      },
    ]);
  };

  const openMenu = () => {
    menuBtnRef.current?.measure((x, y, w, h, px, py) => {
      setMenuPos({ top: py + h + 4, right: SCREEN_WIDTH - px - w });
      setMenuVisible(true);
    });
  };

  const renderItem = ({ item }) => {
    const meta     = getNotifMeta(item.type);
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.item, !item.isRead && styles.unread, selected && { borderColor: colors.primary, borderWidth: 1.5 }]}
        activeOpacity={0.75}
        onPress={() => handlePress(item)}
        onLongPress={() => { setSelectionMode(true); toggleSelect(item.id); }}
      >
        {selectionMode && (
          <View style={[styles.checkbox, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            {selected && <MaterialCommunityIcons name="check" size={14} color="white" />}
          </View>
        )}
        <View style={[styles.iconWrap, { backgroundColor: meta.color + "18" }]}>
          <MaterialCommunityIcons name={meta.icon} size={26} color={meta.color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.itemTitle, { color: colors.textMain }]} numberOfLines={1}>{meta.title}</Text>
          <Text style={[styles.itemMsg,   { color: colors.textSub  }]} numberOfLines={2}>{item.content}</Text>
          <Text style={[styles.itemTime,  { color: colors.textSub  }]}>{item.timeStr}</Text>
        </View>
        {!item.isRead && !selectionMode && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {selectionMode ? (
          <TouchableOpacity onPress={exitSelection} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textMain} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Image source={require("../../assets/images/back.png")} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{selectionMode ? `${selectedIds.size} secildi` : "Bildirimler"}</Text>
        {activeTab === "bildirimler" ? (
          <TouchableOpacity ref={menuBtnRef} onPress={openMenu} hitSlop={12} style={styles.menuBtn}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.textMain} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={fetchPendingRequests} hitSlop={12} style={styles.menuBtn}>
            <MaterialCommunityIcons name="refresh" size={22} color={colors.textMain} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        <Pressable onPress={() => setActiveTab("bildirimler")} style={styles.tabButton}>
          <Text style={[styles.tabText, activeTab === "bildirimler" && styles.tabSelected]}>
            Bildirimler
          </Text>
          {activeTab === "bildirimler" && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable onPress={() => setActiveTab("bağlantılar")} style={styles.tabButton}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.tabText, activeTab === "bağlantılar" && styles.tabSelected]}>
              Bekleyen Bağlantılarım
            </Text>
            {pendingRequests.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.tabBadgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </View>
          {activeTab === "bağlantılar" && <View style={styles.tabUnderline} />}
        </Pressable>
      </View>

      {activeTab === "bildirimler" && (
        loading ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="bell-ring-outline" size={40} color={colors.textSub} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.center}>
                <MaterialCommunityIcons name="bell-off-outline" size={60} color={colors.textSub} />
                <Text style={[styles.emptyText, { color: colors.textSub }]}>Henüz bildirim yok.</Text>
              </View>
            }
          />
        )
      )}

      {activeTab === "bağlantılar" && (
        loadingPending ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <FlatList
            data={pendingRequests}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <PendingConnectionCard
                request={item}
                colors={colors}
                onAccept={handleAccept}
                onReject={handleReject}
                actionLoading={actionLoading}
              />
            )}
            contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.center}>
                <MaterialCommunityIcons name="account-clock-outline" size={60} color={colors.textSub} />
                <Text style={[styles.emptyText, { color: colors.textSub }]}>Bekleyen bağlantı isteği yok.</Text>
              </View>
            }
          />
        )
      )}

      {selectionMode && selectedIds.size > 0 && (
        <TouchableOpacity
          style={[styles.fabDelete, { backgroundColor: "#EF4444" }]}
          onPress={deleteSelected}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="white" />
          <Text style={styles.fabText}>{selectedIds.size} Bildirimi Sil</Text>
        </TouchableOpacity>
      )}

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuPopup, { top: menuPos.top, right: menuPos.right, backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setSelectionMode(true); }}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.textMain} style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Sec</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} onPress={deleteAll}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: "#EF4444" }]}>Tumunu Sil</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <NotifSheet
        notification={selectedNotif}
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setTimeout(() => setSelectedNotif(null), 350); }}
        colors={colors}
      />
    </View>
  );
}

const pcStyles = StyleSheet.create({
  card: { borderRadius: 20, marginBottom: 14, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5 },
  bannerContainer: { height: 80, position: "relative" },
  banner: { width: "100%", height: "100%" },
  bannerPlaceholder: { width: "100%", height: "100%" },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
  avatarRow: { paddingHorizontal: 14, marginTop: -28, marginBottom: 6 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3 },
  infoSection: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 14 },
  infoLeft: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  infoText: { fontSize: 12 },
  timeText: { fontSize: 11, marginTop: 4 },
  actionButtons: { flexDirection: "column", gap: 8, marginLeft: 12 },
  acceptBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  rejectBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1.5, backgroundColor: "transparent" },
});

const getSheetStyles = (colors) => StyleSheet.create({
  sheetTop: { alignItems: "center", marginBottom: 20 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  sheetTime:  { fontSize: 13 },
  msgBox: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24, marginHorizontal: 20 },
  msgText: { fontSize: 15, lineHeight: 24 },
  closeBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginHorizontal: 20, marginBottom: 24 },
  closeBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === "ios" ? 50 : 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backIcon: { width: 24, height: 24, resizeMode: "contain" },
  headerTitle: { color: colors.textMain, fontSize: 18, fontWeight: "bold" },
  menuBtn: { padding: 4 },
  tabBar: { flexDirection: "row", justifyContent: "space-evenly", paddingVertical: 15 },
  tabButton: { alignItems: "center", paddingHorizontal: 20 },
  tabText: { color: colors.textSub, fontSize: 16 },
  tabSelected: { color: colors.primary, fontWeight: "bold" },
  tabUnderline: { marginTop: 4, height: 3, width: "100%", backgroundColor: colors.primary, borderRadius: 2 },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, marginLeft: 5 },
  tabBadgeText: { color: "white", fontSize: 11, fontWeight: "bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: colors.cardBackground, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 12 },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  itemMsg:   { fontSize: 13, lineHeight: 18 },
  itemTime:  { fontSize: 11, marginTop: 4 },
  unreadDot: { width: 9, height: 9, borderRadius: 5 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textSub, alignItems: "center", justifyContent: "center" },
  fabDelete: { position: "absolute", right: 20, bottom: 30, flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 20, borderRadius: 30, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  fabText: { color: "white", fontWeight: "700", fontSize: 14 },
  menuPopup: { position: "absolute", borderRadius: 14, borderWidth: 1, minWidth: 160, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 10, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16 },
  menuItemText: { fontSize: 15, fontWeight: "600" },
  menuDivider: { height: 1, marginHorizontal: 12 },
});
