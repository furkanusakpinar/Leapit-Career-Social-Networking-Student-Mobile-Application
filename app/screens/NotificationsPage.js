import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
} from 'react-native';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { darkTheme, lightTheme } from '../theme/colors';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return `${seconds}sn`;
  if (minutes < 60) return `${minutes}dk`;
  if (hours < 24) return `${hours}sa`;
  if (days < 7) return `${days}gün`;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
};

const getNotifMeta = (type) => {
  switch (type) {
    case 'newPost':      return { title: 'Yeni Paylaşım',          icon: 'post',              color: '#2ECC71' };
    case 'like':         return { title: 'Beğeni',                  icon: 'heart',             color: '#E74C3C' };
    case 'follow':       return { title: 'Yeni Takipçi',            icon: 'account-plus',      color: '#3498DB' };
    case 'jobApproved':  return { title: 'İlanınız Onaylandı ✅',   icon: 'briefcase-check',   color: '#10B981' };
    case 'jobRejected':  return { title: 'İlanınız Reddedildi',     icon: 'briefcase-remove',  color: '#EF4444' };
    default:             return { title: 'Yeni Bildirim',           icon: 'bell-ring-outline', color: '#007AFF' };
  }
};

// ─── Detail Bottom Sheet ───────────────────────────────────────────────────────
function NotifSheet({ notification, visible, onClose, colors }) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 280, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  if (!show || !notification) return null;

  const meta = getNotifMeta(notification.type);

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[ss.backdrop, { opacity }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[ss.sheet, { backgroundColor: colors.cardBackground, transform: [{ translateY }] }]}>
        <View style={ss.handle} />

        {/* İkon + Başlık */}
        <View style={ss.sheetTop}>
          <View style={[ss.iconCircle, { backgroundColor: meta.color + '20' }]}>
            <MaterialCommunityIcons name={meta.icon} size={34} color={meta.color} />
          </View>
          <Text style={[ss.sheetTitle, { color: colors.textMain }]}>{meta.title}</Text>
          <Text style={[ss.sheetTime,  { color: colors.textSub  }]}>{notification.timeStr}</Text>
        </View>

        {/* Mesaj */}
        <View style={[ss.msgBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[ss.msgText, { color: colors.textMain }]}>{notification.content}</Text>
        </View>

        {/* Kapat */}
        <TouchableOpacity style={[ss.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
          <Text style={ss.closeBtnText}>Kapat</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const navigation  = useNavigation();
  const userId      = useSelector(state => state.user.userId);
  const themeMode   = useSelector(state => state.theme?.mode || 'light');
  const isDark      = themeMode === 'dark';
  const colors      = isDark ? darkTheme : lightTheme;
  const styles      = getStyles(colors);

  const [notifications, setNotifications]     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedNotif, setSelectedNotif]     = useState(null);
  const [sheetVisible, setSheetVisible]       = useState(false);

  // 3-nokta menü
  const [menuVisible, setMenuVisible]         = useState(false);
  const menuBtnRef                            = useRef(null);
  const [menuPos, setMenuPos]                 = useState({ top: 0, right: 16 });

  // Seçim modu
  const [selectionMode, setSelectionMode]     = useState(false);
  const [selectedIds, setSelectedIds]         = useState(new Set());

  const unsubRef = useRef(null);

  const isFocused = useIsFocused();

  // ── Alt bar badge temizliği için focus kontrolü ──
  // (Component unmount olmasa bile sayfa odağa geldiğinde useEffect tetiklenecek)
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    if (unsubRef.current) unsubRef.current();

    const q = query(
      collection(db, 'Users', userId, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    unsubRef.current = onSnapshot(q, (snap) => {
      const batch = writeBatch(db);
      let hasUnread = false;

      const fetched = snap.docs.map(d => {
        const data = d.data();
        if (isFocused && !data.isRead) {
          hasUnread = true;
          batch.update(doc(db, 'Users', userId, 'notifications', d.id), { isRead: true });
        }
        const rawDate = data.createdAt?.toDate?.() ?? new Date();
        return {
          id:      d.id,
          type:    data.type || '',
          content: data.content || 'Detaylı bilgi için tıklayın.',
          isRead:  isFocused ? true : (data.isRead || false),
          timeStr: formatTime(rawDate),
          rawDate,
          sourceUserId: data.sourceUserId || null,
        };
      });

      if (hasUnread) {
        batch.commit().catch(err => console.error("Error marking all notifications as read:", err));
      }

      setNotifications(fetched);
      setLoading(false);
    });

    return () => unsubRef.current?.();
  }, [userId, isFocused]);

  // ── Bildirime tıkla ─────────────────────────────────────────────────────────
  const handlePress = async (item) => {
    if (selectionMode) {
      toggleSelect(item.id);
      return;
    }
    if (!item.isRead) {
      await updateDoc(doc(db, 'Users', userId, 'notifications', item.id), { isRead: true });
    }
    if (item.type === 'follow' && item.sourceUserId) {
      navigation.navigate('OtherProfilePage', { userId: item.sourceUserId });
    } else {
      setSelectedNotif(item);
      setSheetVisible(true);
    }
  };

  // ── Seçim ───────────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // ── Seçilenleri sil ─────────────────────────────────────────────────────────
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      batch.delete(doc(db, 'Users', userId, 'notifications', id));
    });
    await batch.commit();
    exitSelection();
  };

  // ── Tümünü sil ──────────────────────────────────────────────────────────────
  const deleteAll = () => {
    setMenuVisible(false);
    Alert.alert(
      'Tümünü Sil',
      'Tüm bildirimler silinsin mi? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            const batch = writeBatch(db);
            notifications.forEach(n => {
              batch.delete(doc(db, 'Users', userId, 'notifications', n.id));
            });
            await batch.commit();
          },
        },
      ]
    );
  };

  // ── 3-nokta menü pozisyonu ──────────────────────────────────────────────────
  const openMenu = () => {
    menuBtnRef.current?.measure((x, y, w, h, px, py) => {
      setMenuPos({ top: py + h + 4, right: SCREEN_WIDTH - px - w });
      setMenuVisible(true);
    });
  };

  // ── Render item ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const meta     = getNotifMeta(item.type);
    const selected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.item,
          !item.isRead && styles.unread,
          selected && { borderColor: colors.primary, borderWidth: 1.5 },
        ]}
        activeOpacity={0.75}
        onPress={() => handlePress(item)}
        onLongPress={() => { setSelectionMode(true); toggleSelect(item.id); }}
      >
        {/* Seçim checkbox */}
        {selectionMode && (
          <View style={[styles.checkbox, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            {selected && <MaterialCommunityIcons name="check" size={14} color="white" />}
          </View>
        )}

        {/* İkon */}
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
          <MaterialCommunityIcons name={meta.icon} size={26} color={meta.color} />
        </View>

        {/* Metin */}
        <View style={styles.textWrap}>
          <Text style={[styles.itemTitle, { color: colors.textMain }]} numberOfLines={1}>{meta.title}</Text>
          <Text style={[styles.itemMsg,   { color: colors.textSub  }]} numberOfLines={2}>{item.content}</Text>
          <Text style={[styles.itemTime,  { color: colors.textSub  }]}>{item.timeStr}</Text>
        </View>

        {/* Okunmamış nokta */}
        {!item.isRead && !selectionMode && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {selectionMode ? (
          <TouchableOpacity onPress={exitSelection} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textMain} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
          </TouchableOpacity>
        )}

        <Text style={styles.headerTitle}>
          {selectionMode ? `${selectedIds.size} seçildi` : 'Bildirimler'}
        </Text>

        {/* 3 nokta */}
        <TouchableOpacity ref={menuBtnRef} onPress={openMenu} hitSlop={12} style={styles.menuBtn}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.textMain} />
        </TouchableOpacity>
      </View>

      {/* ── Bildirim Listesi ─────────────────────────────────────────────────── */}
      {loading ? (
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
      )}

      {/* ── Seçim Silme Butonu (sağ alt) ─────────────────────────────────────── */}
      {selectionMode && selectedIds.size > 0 && (
        <TouchableOpacity
          style={[styles.fabDelete, { backgroundColor: '#EF4444' }]}
          onPress={deleteSelected}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="white" />
          <Text style={styles.fabText}>{selectedIds.size} Bildirimi Sil</Text>
        </TouchableOpacity>
      )}

      {/* ── 3-Nokta Popup Menü ────────────────────────────────────────────────── */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuPopup, { top: menuPos.top, right: menuPos.right, backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); setSelectionMode(true); }}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.textMain} style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Seç</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem} onPress={deleteAll}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Tümünü Sil</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Detail Bottom Sheet ───────────────────────────────────────────────── */}
      <NotifSheet
        notification={selectedNotif}
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setTimeout(() => setSelectedNotif(null), 350); }}
        colors={colors}
      />
    </View>
  );
}

// ─── Sheet Styles ──────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 20,
  },
  sheetTop: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  sheetTime:  { fontSize: 13 },
  msgBox: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, marginBottom: 24,
  },
  msgText: { fontSize: 15, lineHeight: 24 },
  closeBtn: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});

// ─── Page Styles ───────────────────────────────────────────────────────────────
const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: { color: colors.textMain, fontSize: 18, fontWeight: 'bold' },
  menuBtn: { padding: 4 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60,
  },
  emptyText: { fontSize: 15, marginTop: 12 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  itemMsg:   { fontSize: 13, lineHeight: 18 },
  itemTime:  { fontSize: 11, marginTop: 4 },
  unreadDot: { width: 9, height: 9, borderRadius: 5 },

  // Seçim checkbox
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.textSub,
    alignItems: 'center', justifyContent: 'center',
  },

  // FAB sil butonu
  fabDelete: {
    position: 'absolute',
    right: 20, bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Popup menü
  menuPopup: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, marginHorizontal: 12 },
});