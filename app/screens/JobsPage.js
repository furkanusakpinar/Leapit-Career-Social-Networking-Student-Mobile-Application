import { useNavigation, useRoute } from '@react-navigation/native';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { darkTheme, lightTheme } from '../theme/colors';
import { getCompanyLogoUri } from '../utils/getCompanyLogoUri';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';

const JobsPage = () => {
  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [jobTabFilterIndex, setJobTabFilterIndex] = useState(0);
  const [userProfession, setUserProfession] = useState(null);
  const [userData, setUserData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);


  useEffect(() => {
    const fetchUserData = async () => {
      if (userId) {
        try {
          const userDocRef = doc(db, 'Users', userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserData(data);
            setUserProfession(data.job);
          }
        } catch (error) {
          console.error("Error fetching user data: ", error);
        }
      }
    };
    fetchUserData();
  }, [userId]);

  const fetchJobPosts = useCallback(() => {
    setRefreshing(true);
    const postsRef = collection(db, 'JobsPosts');
    const unsubscribe = onSnapshot(query(postsRef, where('status', '==', 'active')), async (snapshot) => {
      let allPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      const postsWithLogos = await Promise.all(
        allPosts.map(async (post) => {
          try {
            const logoUri = await getCompanyLogoUri(post.company || '');
            return { ...post, companyLogo: logoUri };
          } catch (e) {
            console.error('Error fetching company logo:', e);
            return { ...post, companyLogo: null };
          }
        })
      );

      setPosts(postsWithLogos.sort((a, b) => b.createdAt - a.createdAt));
      setRefreshing(false);
    });
    return unsubscribe;
  }, [jobTabFilterIndex, userProfession]);

  useEffect(() => {
    const unsubscribe = fetchJobPosts();
    return () => unsubscribe();
  }, [fetchJobPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobPosts();
  }, [fetchJobPosts]);

  useEffect(() => {
    if (!userId) return;
    const postsRef = collection(db, 'JobsPosts');
    const unsubscribe = onSnapshot(
      query(postsRef, where('userId', '==', userId), where('status', '==', 'pending')),
      async (snapshot) => {
        const rawPending = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        const pendingWithLogos = await Promise.all(
          rawPending.map(async (post) => {
            try {
              const logoUri = await getCompanyLogoUri(post.company || '');
              return { ...post, companyLogo: logoUri };
            } catch (e) {
              return { ...post, companyLogo: null };
            }
          })
        );
        setPendingPosts(pendingWithLogos.sort((a, b) => b.createdAt - a.createdAt));
      }
    );
    return () => unsubscribe();
  }, [userId]);

  return (
    <View style={styles.container}>
      <AppHeader />

      { }
      {showSearchResults && searchQuery.length > 0 && (
        <View style={styles.searchResultsOverlay}>
          <ScrollView style={styles.searchResultsScrollView} keyboardShouldPersistTaps="handled">
            {searchResults.map((result, index) => (
              <Pressable key={index} style={styles.searchResultItem} onPress={() => { }}>
                <Image
                  source={result.profileImageUrl ? { uri: result.profileImageUrl } : require('../../assets/images/ProfileSquare.png')}
                  style={styles.searchResultProfileImage}
                />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultText}>{result.name}</Text>
                  <Text style={styles.searchResultSubText}>Profili Gör</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      { }
      <View style={styles.selectedHeader}>
        <Pressable onPress={() => setJobTabFilterIndex(0)} style={styles.tabButton}>
          <Text style={[styles.tabText, jobTabFilterIndex === 0 && styles.tabSelected]}>Sizin için</Text>
          {jobTabFilterIndex === 0 && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable onPress={() => setJobTabFilterIndex(1)} style={styles.tabButton}>
          <Text style={[styles.tabText, jobTabFilterIndex === 1 && styles.tabSelected]}>Keşfet</Text>
          {jobTabFilterIndex === 1 && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable onPress={() => setJobTabFilterIndex(2)} style={styles.tabButton}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, jobTabFilterIndex === 2 && styles.tabSelected]}>Bekleyenler</Text>
            {pendingPosts.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingPosts.length}</Text>
              </View>
            )}
          </View>
          {jobTabFilterIndex === 2 && <View style={styles.tabUnderline} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {jobTabFilterIndex === 2 ? (
          pendingPosts.length > 0 ? (
            pendingPosts.map(post => (
              <View key={post.id} style={[styles.card, { borderColor: '#f59e0b', borderWidth: 1.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderPressable}>
                    <Image
                      source={
                        post.companyLogo && post.companyLogo.length > 0
                          ? { uri: post.companyLogo }
                          : require('../../assets/images/DefaultCompanyLogo.png')
                      }
                      style={styles.logo}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardDesc} numberOfLines={1}>{post.jobTitle?.length > 30 ? post.jobTitle.slice(0, 30) + '...' : post.jobTitle}</Text>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {post.company} • {post.jobLocation}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.pendingStatusRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <MaterialCommunityIcons name="timer-sand" size={16} color="#f59e0b" />
                    <Text style={styles.pendingStatusText}>Onay bekleniyor</Text>
                  </View>
                  <Text style={styles.pendingDateText}>
                    {post.createdAt instanceof Date ? post.createdAt.toLocaleDateString('tr-TR') : ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noPostsText}>Onay bekleyen ilanınız bulunmamaktadır.</Text>
          )
        ) : (
          posts.length > 0 ? (
            posts.map(post => (
              <View key={post.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Pressable
                    onPress={() => navigation.navigate('JobsDetail', { jobsId: post.id })}
                    style={styles.cardHeaderPressable}
                  >
                    <Image
                      source={
                        post.companyLogo && post.companyLogo.length > 0
                          ? { uri: post.companyLogo }
                          : require('../../assets/images/DefaultCompanyLogo.png')
                      }
                      style={styles.logo}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardDesc} numberOfLines={1}>{post.jobTitle?.length > 30 ? post.jobTitle.slice(0, 30) + '...' : post.jobTitle}</Text>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {post.company} • {post.jobLocation}
                      </Text>
                    </View>
                  </Pressable>
                </View>
                {post.media && typeof post.media === 'string' && post.media.length > 0 ? (
                  <Image source={{ uri: post.media }} style={styles.cardImage} />
                ) : null}
                {post.content && <Text style={styles.postContent}>{post.content}</Text>}
              </View>
            ))
          ) : (
            !refreshing && <Text style={styles.noPostsText}>Henüz iş ilanı bulunmamaktadır.</Text>
          )
        )}
      </ScrollView>
      <BottomNavBar userId={userId} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 15,
  },
  tabButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tabText: {
    color: colors.textSub,
    fontSize: 16,
  },
  tabSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tabUnderline: {
    marginTop: 4,
    height: 3,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scrollViewContent: {
    paddingBottom: 100,
    paddingTop: 10,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.border,
  },
  cardDesc: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardName: {
    color: colors.textMain,
    fontSize: 13,
    opacity: 0.8,
    marginTop: 2,
  },
  postContent: {
    color: colors.textMain,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 10,
    resizeMode: 'cover',
  },
  noPostsText: {
    color: colors.textSub,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 15,
  },
  searchResultsOverlay: {
    position: 'absolute',
    top: 60,
    left: 15,
    right: 15,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    zIndex: 10,
    maxHeight: 300,
    elevation: 5,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  searchResultText: {
    color: colors.textMain,
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultSubText: {
    color: colors.textSub,
    fontSize: 12,
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    paddingHorizontal: 4,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pendingStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingStatusText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingDateText: {
    color: colors.textSub,
    fontSize: 12,
  },
});

export default JobsPage;