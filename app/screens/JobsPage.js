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
import { lightTheme, darkTheme } from '../theme/colors';
import { getCompanyLogoUri } from '../utils/getCompanyLogoUri';

import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';

const JobsPage = () => {
  const [posts, setPosts] = useState([]);
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
    const unsubscribe = onSnapshot(query(postsRef, where('status', '==', 'active')), (snapshot) => {
      let allPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      
      setPosts(allPosts.sort((a, b) => b.createdAt - a.createdAt));
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

  return (
    <View style={styles.container}>
      <AppHeader />

      {}
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

      {}
      <View style={styles.selectedHeader}>
        <Pressable onPress={() => setJobTabFilterIndex(0)} style={styles.tabButton}>
          <Text style={[styles.tabText, jobTabFilterIndex === 0 && styles.tabSelected]}>Sizin için</Text>
          {jobTabFilterIndex === 0 && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable onPress={() => setJobTabFilterIndex(1)} style={styles.tabButton}>
          <Text style={[styles.tabText, jobTabFilterIndex === 1 && styles.tabSelected]}>Keşfet</Text>
          {jobTabFilterIndex === 1 && <View style={styles.tabUnderline} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {posts.length > 0 ? (
          posts.map(post => (
            <View key={post.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Pressable
                  onPress={() => navigation.navigate('JobsDetail', { jobsId: post.id })}
                  style={styles.cardHeaderPressable}
                >
                  <Image
                    source={
                      post.company && typeof getCompanyLogoUri(post.company) === 'string' && getCompanyLogoUri(post.company).length > 0
                        ? { uri: getCompanyLogoUri(post.company) }
                        : require('../../assets/images/ProfileSquare.png')
                    }
                    style={styles.logo}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardDesc} numberOfLines={1}>{post.jobTitle}</Text>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {post.company} • {post.location}
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
});

export default JobsPage;