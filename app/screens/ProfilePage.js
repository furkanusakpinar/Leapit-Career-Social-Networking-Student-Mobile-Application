import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';
import { getCompanyLogoUri } from '../utils/getCompanyLogoUri';
import { getSchoolLogoUri } from '../utils/getSchoolLogoUri';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';


const formatTimeAgo = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return 'Tarih yok';
  const date = timestamp.toDate();
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Az önce';
  let interval = seconds / 3600;
  if (interval > 1 && interval < 24) return Math.floor(interval) + ' saat önce';
  if (interval >= 24) return Math.floor(interval / 24) + ' gün önce';
  return 'Yakın zamanda';
};

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Blog');
  const [tabData, setTabData] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [companyLogoUri, setCompanyLogoUri] = useState(null);
  const [schoolLogoUri, setSchoolLogoUri] = useState(null);

  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);
  
  const { userId } = route.params;

  const fetchUser = async () => {
    if (!userId) return;
    try {
      const userDocRef = doc(db, 'Users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserData(data);
        const followersRef = collection(db, 'Follows');
        const qFollowers = query(followersRef, where('followingId', '==', userId));
        const followersSnapshot = await getDocs(qFollowers);
        setFollowersCount(followersSnapshot.size);
        const qFollowing = query(followersRef, where('followerId', '==', userId));
        const followingSnapshot = await getDocs(qFollowing);
        setFollowingCount(followingSnapshot.size);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchTabData = async () => {
    try {
      let data = [];
      if (selectedTab === 'Blog') {
        const snapshot = await getDocs(collection(db, 'Users', userId, 'blog'));
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else if (selectedTab === 'Projeler') {
        const snapshot = await getDocs(query(collection(db, 'Projeler'), where('userId', '==', userId)));
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else if (selectedTab === 'Postlar') {
        const snapshot = await getDocs(query(collection(db, 'Posts'), where('userId', '==', userId)));
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      setTabData(data);
    } catch (e) { setTabData([]); }
  };

  useEffect(() => { fetchUser(); }, [userId]);
  useEffect(() => { fetchTabData(); }, [selectedTab, userId]);

  useEffect(() => {
    if (userData?.company) getCompanyLogoUri(userData.company).then(setCompanyLogoUri);
    if (userData?.schoolName) getSchoolLogoUri(userData.schoolName).then(setSchoolLogoUri);
  }, [userData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchUser(), fetchTabData()]).then(() => setRefreshing(false));
  }, [userId, selectedTab]);

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/images/back.png')} style={styles.iconBack} />
        </Pressable>
        <Text style={styles.headerTitle}>Profil</Text>
        <Pressable onPress={() => navigation.navigate('ProfileEdit')} style={styles.editBtn}>
          <Image source={require('../../assets/images/userEdit.png')} style={styles.iconEdit} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />}>

        {}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={userData.profileImageUrl ? { uri: userData.profileImageUrl } : require('../../assets/images/ProfileSquare.png')}
              style={styles.avatar}
            />
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.nameText} numberOfLines={1}>{userData.fullName || 'İsimsiz'}</Text>
            <Text style={styles.jobText} numberOfLines={1}>{userData.job || 'Meslek yok'}</Text>
            <View style={styles.infoRow}>
              {schoolLogoUri && <Image source={{ uri: schoolLogoUri }} style={styles.miniLogo} />}
              <Text style={styles.infoSubText} numberOfLines={1}>{userData.schoolName || 'Okul Belirtilmedi'}</Text>
            </View>
          </View>
        </View>

        {}
        <View style={styles.statsContainer}>
          <View style={styles.statsLeft}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followersCount}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followingCount}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </View>
          </View>
          <View style={styles.companyInfo}>
            {companyLogoUri && <Image source={{ uri: companyLogoUri }} style={styles.miniLogo} />}
            <Text style={styles.infoSubText} numberOfLines={1}>{userData.company || 'Şirket yok'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {}
        <View style={styles.paddingArea}>
          <Text style={styles.sectionLabel}>Hakkımda</Text>
          <Text style={styles.bioText}>{userData.bio || 'Henüz bir açıklama eklenmedi.'}</Text>
        </View>

        {}
        <View style={styles.tabBar}>
          {['Blog', 'Projeler', 'Postlar'].map(tab => (
            <Pressable key={tab} onPress={() => setSelectedTab(tab)} style={[styles.tabItem, selectedTab === tab && styles.activeTab]}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        {}
        <View style={styles.paddingArea}>
          {tabData.length > 0 ? tabData.map(item => (
            <View key={item.id} style={styles.card}>
              {selectedTab !== 'Postlar' && <Text style={styles.cardTitle}>{item.title}</Text>}
              <Text style={styles.cardContent}>{item.content}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>{formatTimeAgo(item.createdAt)}</Text>
                {selectedTab !== 'Postlar' && <Text style={styles.moreBtn}>Detayları Gör</Text>}
              </View>
            </View>
          )) : (
            <Text style={styles.emptyText}>Henüz bir içerik bulunmuyor.</Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: colors.textMain, fontSize: 18, fontWeight: 'bold' },
  iconBack: { width: 24, height: 24, resizeMode: 'contain', tintColor: colors.iconTint },
  iconEdit: { width: 20, height: 20, tintColor: colors.iconTint },
  editBtn: { backgroundColor: colors.cardBackground, padding: 10, borderRadius: 50, borderWidth: 1, borderColor: colors.border },

  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%'
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.border, 
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  nameContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center'
  },
  nameText: { color: colors.textMain, fontSize: 20, fontWeight: 'bold' },
  jobText: { color: colors.textSub, fontSize: 14, marginVertical: 2 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
  statsLeft: { flexDirection: 'row' },
  statItem: { marginRight: 25 },
  statValue: { color: colors.textMain, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: colors.textSub, fontSize: 12 },
  companyInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  miniLogo: { width: 16, height: 16, borderRadius: 4, marginRight: 6 },
  infoSubText: { color: colors.textSub, fontSize: 12, flex: 1 },

  paddingArea: { padding: 20 },
  sectionLabel: { color: colors.textSub, fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  bioText: { color: colors.textMain, fontSize: 14, lineHeight: 22 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginVertical: 10 },

  tabBar: { flexDirection: 'row', marginTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: colors.textMain },
  tabText: { color: colors.textSub, fontWeight: 'bold' },
  activeTabText: { color: colors.textMain },

  card: { backgroundColor: colors.cardBackground, padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.textMain, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardContent: { color: colors.textSub, fontSize: 14, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  dateText: { color: colors.textSub, fontSize: 11 },
  moreBtn: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: colors.textSub, textAlign: 'center', marginTop: 20 }
});