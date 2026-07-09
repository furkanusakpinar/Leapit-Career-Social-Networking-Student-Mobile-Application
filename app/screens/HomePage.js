import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import moment from 'moment';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Alert } from 'react-native';
import { db } from '../../firebaseConfig';
import HomePageSkeleton from '../skeleton/HomePageSkeleton';
import { deleteUserData } from '../utils/deleteUser';
import { deleteFromCloudinary } from '../utils/cloudinary';

import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import CommentModal from '../components/CommentModal';
import PostOptionsMenu from '../components/PostOptionsMenu';
import VideoPlayer from '../components/VideoPlayer';
import { lightTheme, darkTheme } from '../theme/colors';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num || 0;
};

const truncateString = (str, maxLength) => {
  if (!str) return '';
  return str.length <= maxLength ? str : str.substring(0, maxLength - 3) + '...';
};

const ActionButton = ({ iconComponent, onPress, isActive, activeColor, inactiveColor, label, iconStyle, textSub, styles }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable style={styles.actionButton} onPress={handlePress}>
      <Animated.View
        style={[
          styles.actionIconContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        {iconComponent({ color: isActive ? activeColor : inactiveColor, size: 20 })}
      </Animated.View>
      {label && (
        <Text style={[styles.actionLabel, { color: textSub }, isActive && { color: activeColor }]}>{label}</Text>
      )}
    </Pressable>
  );
};

const PostActions = ({ post, colors, styles, onAction, onCommentPress }) => {
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num || 0;
  };

  return (
    <View>
      {(post.likesCount > 0 || post.commentsCount > 0 || post.repeatsCount > 0) && (
        <View style={styles.statsRow}>
          <View style={styles.statsLeft}>
            {post.likesCount > 0 && (
              <>
                <Image
                  source={require('../../assets/images/circleLike.png')}
                  style={styles.reactionIcon}
                />
                <Text style={styles.statText}>
                  {formatNumber(post.likesCount)} Beğeni
                </Text>
              </>
            )}
          </View>
          <Text style={styles.statText}>
            {post.commentsCount > 0 ? `${formatNumber(post.commentsCount)} comments` : ''}
            {(post.commentsCount > 0 && post.repeatsCount > 0) ? ' • ' : ''}
            {post.repeatsCount > 0 ? `${formatNumber(post.repeatsCount)} reposts` : ''}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.cardActions}>
        <ActionButton
          iconComponent={(props) => (
            <MaterialCommunityIcons name={post.liked ? "heart" : "heart-outline"} {...props} />
          )}
          isActive={post.liked}
          activeColor="#FF4B4B"
          inactiveColor={colors.iconTint}
          textSub={colors.textSub}
          label="Like"
          styles={styles}
          onPress={() => onAction(post.id, 'likedBy', post.liked)}
        />
        <ActionButton
          iconComponent={(props) => (
            <MaterialCommunityIcons name="comment-outline" {...props} />
          )}
          label="Comment"
          inactiveColor={colors.iconTint}
          textSub={colors.textSub}
          styles={styles}
          onPress={() => onCommentPress(post.id)}
        />
        <ActionButton
          iconComponent={(props) => (
            <MaterialCommunityIcons name={post.repeated ? "repeat" : "repeat-variant"} {...props} />
          )}
          isActive={post.repeated}
          activeColor="#00BA7C"
          inactiveColor={colors.iconTint}
          textSub={colors.textSub}
          label="Repost"
          styles={styles}
          onPress={() => onAction(post.id, 'repeatedBy', post.repeated)}
        />
        <ActionButton
          iconComponent={(props) => (
            <MaterialIcons name="share" {...props} />
          )}
          label="Send"
          inactiveColor={colors.iconTint}
          textSub={colors.textSub}
          styles={styles}
          onPress={() => { }}
        />
      </View>
    </View>
  );
};

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const navigation = useNavigation();
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [userData, setUserData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [optionsPost, setOptionsPost] = useState(null);
  const [menuAnchorY, setMenuAnchorY] = useState(0);

  const handleToggleSave = async (post) => {
    await handleAction(post.id, 'savedBy', post.saved);
    setOptionsPost(null); // Menüyü kapat
  };

  const handleDeleteAllTestUsers = () => {
    Alert.alert(
      '⚠️ Dikkat!',
      'leapitapp@gmail.com dışındaki TÜM kullanıcılar ve onlara ait veriler silinecek. Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const usersRef = collection(db, 'Users');
              const q = query(usersRef, where('email', '!=', 'leapitapp@gmail.com'));
              const snapshot = await getDocs(q);
              const deletePromises = snapshot.docs.map(d => deleteUserData(d.id));
              await Promise.all(deletePromises);
              Alert.alert('✅ Tamamlandı', `${snapshot.docs.length} kullanıcı ve tüm verileri silindi.`);
            } catch (e) {
              console.error('Silme hatası:', e);
              Alert.alert('Hata', 'Kullanıcılar silinirken bir sorun oluştu.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleAction = async (postId, field, isActive) => {
    if (!userId) {
      console.log("Hata: userId bulunamadı!");
      return;
    }

    // Save işlemi için özel mantık
    if (field === 'savedBy') {
        try {
            // Kategoriyi gönderinin türüne göre belirle (varsayılan: 'Postlar')
            // 'Posts' koleksiyonundan gelen verinin yapısına göre kategoriyi belirliyoruz
            const category = 'Postlar';

            // Yeni yapı: Users/{userId}/saves/{category}/items/{postId}
            const saveRef = doc(db, 'Users', userId, 'saves', category, 'items', postId);

            if (isActive) {
                await deleteDoc(saveRef);
            } else {
                await setDoc(saveRef, {
                    postId: postId,
                    savedAt: new Date()
                });
            }
        } catch (error) {
            console.error("Save işlemi hatası:", error);
            Alert.alert("Hata", "Kaydetme işlemi başarısız oldu.");
        }
    }

    const postRef = doc(db, 'Posts', postId);
    try {
      await updateDoc(postRef, {
        [field]: isActive ? arrayRemove(userId) : arrayUnion(userId)
      });
      console.log("Post koleksiyonu güncellendi");
    } catch (error) {
      console.error(`${field} hatası:`, error);
    }
  };

  const onOptionsPress = (post, pageY) => {
    setMenuAnchorY(pageY || 0);
    setOptionsPost(post);
  };

  const handleDeletePost = async () => {
    const post = optionsPost;
    setOptionsPost(null);
    if (!post) return;
    try {
      if (post.mediaUri) {
        await deleteFromCloudinary(post.mediaUri, post.mediaType || 'image');
      }
      await deleteDoc(doc(db, 'Posts', post.id));
      Alert.alert('Başarılı', 'Gönderi silindi.');
    } catch (e) {
      console.error('Silme hatası:', e);
      Alert.alert('Hata', 'Gönderi silinirken bir hata oluştu.');
    }
  };

  const handleReportPost = () => {
    setOptionsPost(null);
    Alert.alert('Bildirildi', 'Gönderi başarıyla bildirildi.');
  };

  const toggleExpand = (postId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  useEffect(() => {
    if (!userId) return;
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'Users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setUserData(userSnap.data());
      } catch (error) { console.error('Veri hatası:', error); }
    };
    fetchUserData();
  }, [userId]);

  useEffect(() => {
    if (!db || !userId) return;
    const q = query(collection(db, 'Posts'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async snapshot => {
      const postsArr = await Promise.all(snapshot.docs.map(async docSnap => {
        const data = docSnap.data();

        let profileImageUrl = null, userName = 'Bilinmeyen Kullanıcı', detailsArr = [];
        try {
          const userRef = doc(db, 'Users', data.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            profileImageUrl = uData.profileImageUrl || null;
            userName = uData.fullName || 'Bilinmeyen Kullanıcı';
            detailsArr = [uData.company, uData.job].filter(Boolean);
          }
        } catch (e) { console.error("Profil yükleme hatası:", e); }

        return {
          id: docSnap.id,
          ...data,
          profileImageUrl,
          userName,
          liked: data.likedBy?.includes(userId) || false,
          repeated: data.repeatedBy?.includes(userId) || false,
          saved: data.savedBy?.includes(userId) || false,
          likesCount: data.likedBy?.length || 0,
          repeatsCount: data.repeatedBy?.length || 0,
          savedCount: data.savedBy?.length || 0,
          commentsCount: data.comments?.length || 0,
          details: detailsArr.join(' | '),
        };
      }));

      setPosts(postsArr.filter(p => p !== null));
      setPageLoading(false);
    });

    return () => unsubscribe();
  }, [userId, userData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (pageLoading) return <HomePageSkeleton />;

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {posts.map(post => {
          const isExpanded = expandedPosts[post.id];
          const hasMedia = !!(post.mediaUri && post.mediaUri.length > 5);
          const displayContent = (post.content?.length > 100 && !isExpanded) ? post.content.substring(0, 100) + "..." : post.content;

          return (
            <View key={post.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Pressable onPress={() => navigation.navigate('OtherProfilePage', { userId: post.userId })}>
                  <Image
                    source={
                      post.profileImageUrl && typeof post.profileImageUrl === 'string' && post.profileImageUrl.length > 0
                        ? { uri: post.profileImageUrl }
                        : require('../../assets/images/ProfileSquare.png')
                    }
                    style={styles.cardProfil}
                  />
                </Pressable>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.cardName}>{post.userName}</Text>
                  {post.details?.length > 0 && <Text style={styles.followerCountText}>{truncateString(post.details, 50)}</Text>}
                  <Text style={styles.cardTime}>{moment(post.createdAt?.seconds * 1000).fromNow()} • 🌎</Text>
                </View>

                <Pressable style={styles.optionsContainer} onPress={(event) => onOptionsPress(post, event.nativeEvent.pageY)}>
                  <Text style={styles.optionsText}>···</Text>
                </Pressable>
              </View>

              <View style={styles.contentSection}>
                <Text style={styles.cardDescInline}>
                  {displayContent}
                  {post.content?.length > 100 && (
                    <Text onPress={() => toggleExpand(post.id)} style={styles.moreText}>
                      {isExpanded ? " Daha Az" : " ...daha fazla"}
                    </Text>
                  )}
                </Text>
              </View>

              {hasMedia && (
                <View style={styles.mediaWrapper}>
                  {post.mediaType === 'image' ? (
                    <Image source={{ uri: post.mediaUri }} style={styles.mediaContent} resizeMode="cover" />
                  ) : (
                    <VideoPlayer videoUri={post.mediaUri} style={styles.mediaContent} />
                  )}
                </View>
              )}

              <PostActions
                post={post}
                colors={colors}
                styles={styles}
                onAction={handleAction}
                onCommentPress={(id) => {
                  setActivePostId(id);
                  setCommentModalVisible(true);
                }}
              />
            </View>
          );
        })}
      </ScrollView>
      <BottomNavBar userId={userId} />
      <CommentModal
        visible={commentModalVisible}
        onClose={() => { setCommentModalVisible(false); setActivePostId(null); }}
        postId={activePostId}
        currentUserId={userId}
      />
      <PostOptionsMenu
        visible={!!optionsPost}
        isOwnPost={optionsPost?.userId === userId}
        isSaved={optionsPost?.saved}
        onDelete={handleDeletePost}
        onReport={handleReportPost}
        onSave={() => handleToggleSave(optionsPost)}
        onClose={() => setOptionsPost(null)}
        anchorY={menuAnchorY}
      />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: { paddingBottom: 110, paddingTop: 20 },
  card: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 10,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  cardProfil: { width: 44, height: 44, marginRight: 12, borderRadius: 22, backgroundColor: colors.border, borderWidth: 1, borderColor: colors.border },
  headerTextContainer: { flex: 1, justifyContent: 'center' },
  cardName: { color: colors.textMain, fontSize: 15, fontWeight: '700' },
  followerCountText: { color: colors.textSub, fontSize: 12, marginTop: 2 },
  cardTime: { color: colors.textSub, fontSize: 11, marginTop: 2 },
  optionsContainer: { padding: 5, paddingRight: 0 },
  optionsText: { color: colors.textSub, fontSize: 20, fontWeight: 'bold', marginTop: -15 },
  saveIconContainer: { marginRight: 10, padding: 5 },
  contentSection: { paddingHorizontal: 15, paddingBottom: 12 },
  cardDescInline: { color: colors.textMain, fontSize: 14, lineHeight: 21 },
  moreText: { color: colors.textSub, fontSize: 14, fontWeight: '600' },
  mediaWrapper: { width: '100%', aspectRatio: 1.2, backgroundColor: colors.background },
  mediaContent: { width: '100%', height: '100%' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    resizeMode: 'contain'
  },
  statText: { color: colors.textSub, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 15 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  actionIconContainer: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { width: 20, height: 20, resizeMode: 'contain' },
  actionLabel: { color: colors.textSub, fontSize: 13, marginLeft: 6, fontWeight: '600' },
  deleteAllButton: {
    backgroundColor: '#FF3B30',
    marginHorizontal: 10,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAllButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default HomePage;