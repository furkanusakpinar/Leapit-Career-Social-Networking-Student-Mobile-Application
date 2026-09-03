import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';

import BottomNavBar from '../components/BottomNavBar';
import SocialSkeleton from '../skeleton/SocailSkeleton';

const { width } = Dimensions.get('window');

const Social = () => {
  const navigation = useNavigation();
  const userId = useSelector(state => state.user.userId);
  const [conversations, setConversations] = useState([]);
  const [connectionSuggestions, setConnectionSuggestions] = useState([]);
  const [connectedIds, setConnectedIds] = useState(new Set());
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [menuVisible, setMenuVisible] = useState(false);
  const menuBtnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 16 });

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  
  const unsubscribeRef = useRef(null);

  const formatTime = useCallback((date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}sn`;
    if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  }, []);

  
  const fetchSuggestions = useCallback(async () => {
    if (!userId) return;
    try {
      const allUsers = await getDocs(collection(db, 'Users'));
      const suggestions = [];
      allUsers.forEach(u => {
        const data = u.data();
        if (u.id !== userId && data.fullName && (data.profileCompleted === true || data.isProfileComplete === true)) {
          suggestions.push({
            recipientId: u.id,
            name: data.fullName,
            jobTitle: data.jobTitle || data.job || data.profession || '',
            profileImageUrl: data.profileImageUrl || null,
            backProfileImageUrl: data.backProfileImageUrl || null,
            school: data.school || '',
            company: data.company || '',
            degree: data.degree || '',
            branch: data.branch || '',
          });
        }
      });
      setConnectionSuggestions(suggestions.slice(0, 10));
    } catch (e) {
      console.error("Öneri hatası:", e);
    }
  }, [userId]);

  const handleConnectToggle = (id) => {
    setConnectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  
  const listenConversations = useCallback(() => {
    if (!db || !userId) return;

    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const q = query(collection(db, 'Users', userId, 'chats'), orderBy('lastMessageCreatedAt', 'desc'));

    unsubscribeRef.current = onSnapshot(q, async (snapshot) => {
      const convArr = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let profileImageUrl = data.otherUserProfileImageUrl;
        let name = data.otherUserName || 'Bilinmeyen';

        
        try {
          const userRef = doc(db, 'Users', data.otherUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            profileImageUrl = userSnap.data().profileImageUrl || null;
            name = userSnap.data().fullName || name;
          }
        } catch (e) {
          console.log("Profil detayı hatası:", e);
        }

        return {
          id: docSnap.id,
          recipientId: data.otherUserId,
          name: name,
          profileImageUrl: profileImageUrl,
          lastMessage: data.lastMessageText,
          time: data.lastMessageCreatedAt ? formatTime(data.lastMessageCreatedAt.toDate()) : '',
          unread: data.unread || false,
        };
      }));

      setConversations(convArr);
      setPageLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Snapshot hatası:", error);
      setRefreshing(false);
    });
  }, [userId, formatTime]);

  
  useEffect(() => {
    fetchSuggestions();
    listenConversations();

    
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [fetchSuggestions, listenConversations]);

  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSuggestions();
    listenConversations();
    
    setTimeout(() => setRefreshing(false), 2000);
  }, [fetchSuggestions, listenConversations]);

  const handleChatPress = async (chatData) => {
    if (chatData.unread) {
      const chatDocRef = doc(db, 'Users', userId, 'chats', chatData.id);
      await updateDoc(chatDocRef, { unread: false });
    }
    navigation.navigate('SendMessage', {
      recipientId: chatData.recipientId,
      recipientName: chatData.name,
      recipientProfileImageUrl: chatData.profileImageUrl,
    });
  };

  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openMenu = () => {
    menuBtnRef.current?.measure((x, y, w, h, px, py) => {
      setMenuPos({ top: py + h + 4, right: width - px - w });
      setMenuVisible(true);
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.delete(doc(db, 'Users', userId, 'chats', id)));
    await batch.commit();
    exitSelection();
  };

  if (pageLoading) return <SocialSkeleton />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {selectionMode ? (
          <Pressable onPress={exitSelection} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textMain} />
          </Pressable>
        ) : (
          <Pressable onPress={() => navigation.goBack()}>
            <Image
              source={require('../../assets/images/back.png')}
              style={[styles.backIcon, { tintColor: colors.iconTint }]}
            />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>{selectionMode ? `${selectedIds.size} secildi` : 'Mesajlar'}</Text>
        <TouchableOpacity ref={menuBtnRef} onPress={openMenu} hitSlop={12} style={styles.menuBtn} disabled={selectionMode}>
          <MaterialCommunityIcons
            name={selectionMode ? 'close' : 'dots-vertical'}
            size={selectionMode ? 0 : 24}
            color={colors.textMain}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={() => (
          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>Bağlantılar</Text>
            <FlatList
              data={connectionSuggestions}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.recipientId}
              contentContainerStyle={{ paddingRight: 16 }}
              renderItem={({ item }) => {
                const isStudent = !!(item.degree || item.branch);
                return (
                <Pressable
                  style={styles.connCard}
                  onPress={() => navigation.navigate('OtherProfilePage', { userId: item.recipientId })}
                >
                  <View style={styles.connCoverArea}>
                    <Image
                      source={item.backProfileImageUrl
                        ? { uri: item.backProfileImageUrl }
                        : { uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=100&auto=format&fit=crop' }}
                      style={styles.connCoverImage}
                    />
                  </View>
                  <View style={styles.connBodyRow}>
                    <View style={styles.connAvatarWrap}>
                      {item.profileImageUrl ? (
                        <Image source={{ uri: item.profileImageUrl }} style={styles.connAvatar} />
                      ) : (
                        <View style={[styles.connAvatar, styles.connAvatarPlaceholder]}>
                          <MaterialCommunityIcons name="account" size={30} color={colors.textSub} />
                        </View>
                      )}
                    </View>
                    <View style={styles.connInfo}>
                      <Text style={styles.connName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.connJob} numberOfLines={1}>
                        {isStudent
                          ? (item.branch || item.jobTitle ? `Öğrenci • ${item.branch || item.jobTitle}` : 'Öğrenci')
                          : (item.jobTitle || 'Üye')}
                      </Text>
                      <View style={styles.connDetailRow}>
                        <MaterialCommunityIcons name="school-outline" size={11} color={colors.textSub} />
                        <Text style={styles.connDetailText} numberOfLines={1}>{item.school || 'Okul bilgisi yok'}</Text>
                      </View>
                      <View style={styles.connDetailRow}>
                        <MaterialCommunityIcons name="briefcase-outline" size={11} color={colors.textSub} />
                        <Text style={styles.connDetailText} numberOfLines={1}>
                          {isStudent ? 'Şirket yok' : (item.company || 'Şirket bilgisi yok')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.connButton, connectedIds.has(item.recipientId) && styles.connButtonActive]}
                    onPress={() => handleConnectToggle(item.recipientId)}
                  >
                    <Ionicons
                      name={connectedIds.has(item.recipientId) ? 'checkmark' : 'person-add'}
                      size={14}
                      color="#FFF"
                    />
                    <Text style={styles.connButtonText}>
                      {connectedIds.has(item.recipientId) ? 'Bağlanıldı' : 'Bağlantı kur'}
                    </Text>
                  </Pressable>
                </Pressable>
                );
              }}
            />
            <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Mesajlar</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          return (
          <Pressable
            style={[styles.msgItem, item.unread && styles.unreadBg, selected && styles.msgItemSelected]}
            onPress={() => selectionMode ? toggleSelect(item.id) : handleChatPress(item)}
            onLongPress={() => { setSelectionMode(true); toggleSelect(item.id); }}
            delayLongPress={300}
          >
            {selectionMode && (
              <View style={[styles.checkbox, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {selected && <MaterialCommunityIcons name="check" size={14} color="white" />}
              </View>
            )}
            <View style={styles.msgAvatarWrap}>
              {item.profileImageUrl ? (
                <Image source={{ uri: item.profileImageUrl }} style={styles.msgAvatar} />
              ) : (
                <MaterialCommunityIcons name="account-circle" size={50} color={colors.textSub} />
              )}
            </View>
            <View style={styles.msgTextWrap}>
              <Text style={[styles.msgName, item.unread && styles.msgNameUnread]}>{item.name}</Text>
              <Text style={[styles.msgLast, item.unread && styles.msgLastUnread]} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            <View style={styles.msgRight}>
              <Text style={styles.msgTime}>{item.time}</Text>
              {item.unread && !selectionMode && <View style={styles.unreadDot} />}
            </View>
          </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Henüz mesaj yok.</Text>}
      />

      <BottomNavBar userId={userId} />

      {selectionMode && selectedIds.size > 0 && (
        <TouchableOpacity
          style={[styles.fabDelete, { backgroundColor: '#EF4444' }]}
          onPress={deleteSelected}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="white" />
          <Text style={styles.fabText}>{selectedIds.size} Sohbeti Sil</Text>
        </TouchableOpacity>
      )}

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuPopup, { top: menuPos.top, right: menuPos.right, backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setSelectionMode(true); }}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.textMain} style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Seç</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 40 : 50 },
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
  headerTitle: { color: colors.textMain, fontSize: 18, fontWeight: '700' },
  headerSection: { paddingVertical: 10 },
  sectionTitle: { color: colors.textMain, fontSize: 16, fontWeight: '700', marginLeft: 16, marginBottom: 15 },
  connCard: { backgroundColor: colors.cardBackground, width: 200, borderRadius: 14, marginLeft: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, paddingBottom: 12 },
  connCoverArea: { width: '100%', height: 52, backgroundColor: colors.border },
  connCoverImage: { width: '100%', height: '100%', opacity: 0.5 },
  connBodyRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 2 },
  connAvatarWrap: { marginTop: -22, borderWidth: 3, borderColor: colors.cardBackground, borderRadius: 14, backgroundColor: colors.border, overflow: 'hidden', zIndex: 1, alignSelf: 'flex-start' },
  connAvatar: { width: 48, height: 48, resizeMode: 'cover', backgroundColor: colors.border },
  connAvatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  connInfo: { flex: 1, marginLeft: 10, marginTop: 8 },
  connName: { color: colors.textMain, fontSize: 14, fontWeight: 'bold' },
  connJob: { color: colors.textSub, fontSize: 12, marginTop: 2 },
  connDetailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  connDetailText: { color: colors.textSub, fontSize: 11, marginLeft: 3, flex: 1 },
  connButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 36,
    marginHorizontal: 12,
    marginTop: 12,
    gap: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  connButtonActive: { backgroundColor: '#00BA7C', shadowColor: '#00BA7C' },
  connButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  msgItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadBg: { borderColor: colors.primary, borderWidth: 1, backgroundColor: 'rgba(29, 155, 240, 0.05)' },
  msgAvatarWrap: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.cardBackground, overflow: 'hidden', marginRight: 12 },
  msgAvatar: { width: '100%', height: '100%' },
  msgTextWrap: { flex: 1 },
  msgName: { color: colors.textMain, fontSize: 15, fontWeight: '600' },
  msgNameUnread: { fontWeight: '800' },
  msgLast: { color: colors.textSub, fontSize: 13, marginTop: 2 },
  msgLastUnread: { color: colors.textMain, fontWeight: '600' },
  msgRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  msgTime: { color: colors.textSub, fontSize: 11 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  emptyText: { color: colors.textSub, textAlign: 'center', marginTop: 50 },
  msgItemSelected: { borderColor: colors.primary, borderWidth: 1.5 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textSub,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuBtn: { padding: 4 },
  menuPopup: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, marginHorizontal: 12 },
  fabDelete: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  fabText: { color: 'white', fontSize: 15, fontWeight: '700' },
});

export default Social;