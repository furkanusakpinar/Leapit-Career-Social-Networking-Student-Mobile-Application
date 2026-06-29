import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
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
  const isFocused = useIsFocused();
  const userId = useSelector(state => state.user.userId);
  const [conversations, setConversations] = useState([]);
  const [connectionSuggestions, setConnectionSuggestions] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        if (u.id !== userId && u.data().fullName) {
          suggestions.push({
            recipientId: u.id,
            name: u.data().fullName,
            profession: u.data().job || u.data().profession,
            profileImageUrl: u.data().profileImageUrl
          });
        }
      });
      setConnectionSuggestions(suggestions.slice(0, 10));
    } catch (e) {
      console.error("Öneri hatası:", e);
    }
  }, [userId]);

  
  const listenConversations = useCallback(() => {
    if (!db || !userId) return;

    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const q = query(collection(db, 'Users', userId, 'chats'), orderBy('lastMessageCreatedAt', 'desc'));

    unsubscribeRef.current = onSnapshot(q, async (snapshot) => {
      const unreadDocRefs = [];
      snapshot.docs.forEach(docSnap => {
        if (isFocused && docSnap.data().unread === true) {
          unreadDocRefs.push(docSnap.ref);
        }
      });

      if (unreadDocRefs.length > 0) {
        Promise.all(unreadDocRefs.map(ref => updateDoc(ref, { unread: false })))
          .catch(err => console.error("Error auto-reading chats:", err));
      }

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
          unread: isFocused ? false : (data.unread || false),
        };
      }));

      setConversations(convArr);
      setPageLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Snapshot hatası:", error);
      setRefreshing(false);
    });
  }, [userId, formatTime, isFocused]);

  
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

  if (pageLoading) return <SocialSkeleton />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image
            source={require('../../assets/images/back.png')}
            style={[styles.backIcon, { tintColor: colors.iconTint }]}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <View style={{ width: 32 }} />
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
              renderItem={({ item }) => (
                <Pressable style={styles.connCard} onPress={() => handleChatPress(item)}>
                  <View style={styles.connAvatarWrap}>
                    {item.profileImageUrl ? (
                      <Image source={{ uri: item.profileImageUrl }} style={styles.connAvatar} />
                    ) : (
                      <MaterialCommunityIcons name="account-circle" size={60} color={colors.textSub} />
                    )}
                  </View>
                  <Text style={styles.connName} numberOfLines={1}>{item.name}</Text>
                </Pressable>
              )}
            />
            <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Mesajlar</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.msgItem, item.unread && styles.unreadBg]}
            onPress={() => handleChatPress(item)}
          >
            <View style={styles.msgAvatarWrap}>
              {item.profileImageUrl ? (
                <Image source={{ uri: item.profileImageUrl }} style={styles.msgAvatar} />
              ) : (
                <MaterialCommunityIcons name="account-circle" size={50} color={colors.textSub} />
              )}
            </View>
            <View style={styles.msgTextWrap}>
              <Text style={styles.msgName}>{item.name}</Text>
              <Text style={styles.msgLast} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            <View style={styles.msgRight}>
              <Text style={styles.msgTime}>{item.time}</Text>
              {item.unread && <View style={styles.unreadDot} />}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Henüz mesaj yok.</Text>}
      />

      <BottomNavBar userId={userId} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 40 : 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 15 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: { color: colors.textMain, fontSize: 18, fontWeight: '700' },
  headerSection: { paddingVertical: 10 },
  sectionTitle: { color: colors.textMain, fontSize: 16, fontWeight: '700', marginLeft: 16, marginBottom: 15 },
  connCard: { alignItems: 'center', width: 75, marginLeft: 16 },
  connAvatarWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.cardBackground, overflow: 'hidden', marginBottom: 5 },
  connAvatar: { width: '100%', height: '100%' },
  connName: { color: colors.textMain, fontSize: 11, textAlign: 'center' },
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
  msgAvatarWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.cardBackground, overflow: 'hidden', marginRight: 12 },
  msgAvatar: { width: '100%', height: '100%' },
  msgTextWrap: { flex: 1 },
  msgName: { color: colors.textMain, fontSize: 15, fontWeight: '600' },
  msgLast: { color: colors.textSub, fontSize: 13, marginTop: 2 },
  msgRight: { alignItems: 'flex-end', marginLeft: 10 },
  msgTime: { color: colors.textSub, fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 },
  emptyText: { color: colors.textSub, textAlign: 'center', marginTop: 50 }
});

export default Social;