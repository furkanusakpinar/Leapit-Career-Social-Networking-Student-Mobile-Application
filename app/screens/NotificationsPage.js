import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';

const { width } = Dimensions.get('window');


const NotificationItem = React.memo(({ title, message, time, isRead, onPress, iconName, iconColor, styles }) => (
  <View style={[
    styles.notificationWrapper,
    !isRead ? styles.unreadNotificationBackground : styles.readNotificationBackground
  ]}>
    <TouchableOpacity style={styles.item} onPress={onPress}>

      {}
      <View style={styles.avatarContainer}>
        <MaterialCommunityIcons
          name={iconName || "bell-ring"}
          size={32}
          color={iconColor || "#007AFF"}
        />
      </View>

      {}
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>{title}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {message}
          <Text style={styles.timeText}> • {time}</Text>
        </Text>
      </View>

      {}
      <View style={styles.rightContentContainer}>
        {!isRead && <View style={styles.unreadIndicator} />}
      </View>
    </TouchableOpacity>
  </View>
));


export default function NotificationsPage() {
  const navigation = useNavigation();
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unsubscribeRef = useRef(null);

  const formatTime = useCallback((date) => {
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
  }, []);

  const fetchNotifications = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (unsubscribeRef.current) unsubscribeRef.current();

    const notificationsRef = collection(db, 'Users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        const rawDate = data.createdAt ? data.createdAt.toDate() : new Date();

        let title = "Yeni Bildirim";
        let iconName = "bell-ring-outline";
        let iconColor = "#007AFF";

        if (data.type === 'newPost') {
          title = "Yeni Paylaşım";
          iconName = "post";
          iconColor = "#2ECC71";
        } else if (data.type === 'like') {
          title = "Beğeni";
          iconName = "heart";
          iconColor = "#E74C3C";
        } else if (data.type === 'follow') {
          title = "Yeni Takipçi";
          iconName = "account-plus";
          iconColor = "#3498DB";
        }

        return {
          id: docSnapshot.id,
          title: title,
          message: data.content || 'Detaylı bilgi için tıklayın.',
          time: formatTime(rawDate),
          isRead: data.isRead || false,
          iconName,
          iconColor,
        };
      });

      setNotifications(fetched);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
      setRefreshing(false);
    });
  }, [userId, formatTime]);

  useEffect(() => {
    fetchNotifications();
    return () => unsubscribeRef.current && unsubscribeRef.current();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = async (notificationData) => {
    if (!notificationData.isRead) {
      const docRef = doc(db, 'Users', userId, 'notifications', notificationData.id);
      await updateDoc(docRef, { isRead: true });
    }
    
  };

  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
        </Pressable>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.tabText}>Tüm Bildirimler</Text>
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <NotificationItem
              {...item}
              onPress={() => handleNotificationPress(item)}
              styles={styles}
            />
          )}
          ListEmptyComponent={
            <ScrollView contentContainerStyle={styles.emptyContainer}>
              <MaterialCommunityIcons name="bell-off-outline" size={60} color={colors.textSub} />
              <Text style={styles.emptyText}>Henüz hiç bildiriminiz yok.</Text>
            </ScrollView>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: {
    color: colors.textMain,
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabText: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationWrapper: {
    marginVertical: 6,
    marginHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  unreadNotificationBackground: {
    backgroundColor: colors.cardBackground,
    opacity: 0.9,
  },
  readNotificationBackground: {
    backgroundColor: colors.cardBackground,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatarContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    color: colors.textMain,
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    color: colors.textSub,
    fontSize: 14,
    marginTop: 2,
  },
  timeText: {
    color: colors.textSub,
    fontSize: 12,
    opacity: 0.8,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: colors.textSub,
    fontSize: 16,
    marginTop: 12,
  },
});