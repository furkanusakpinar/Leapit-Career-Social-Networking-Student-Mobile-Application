import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, deleteDoc, doc, getDoc, getDocs, query, where, arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';
import moment from 'moment';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { db } from '../../firebaseConfig';
import { getCompanyLogoUri } from '../utils/getCompanyLogoUri';
import { getSchoolLogoUri } from '../utils/getSchoolLogoUri';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';
import { BlurView } from 'expo-blur';
import VideoPlayer from '../components/VideoPlayer';
import CommentModal from '../components/CommentModal';
import PostOptionsMenu from '../components/PostOptionsMenu';
import { deleteFromCloudinary } from '../utils/cloudinary';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

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

const buildReadmeHtml = (content, isDark) => {
  const bg      = isDark ? '#101216' : '#ffffff';
  const text    = isDark ? '#e6edf3' : '#1f2328';
  const codeBg  = isDark ? '#161b22' : '#f6f8fa';
  const border  = isDark ? '#30363d' : '#d1d9e0';
  const hBorder = isDark ? '#21262d' : '#d1d9e0';
  const blockBg = isDark ? '#161b22' : '#f6f8fa';
  const link    = '#0969da';
  const subText = isDark ? '#848d97' : '#636c76';

  const raw = content || '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: ${bg};
    color: ${text};
    font-size: 14px;
    line-height: 1.6;
    padding: 16px;
    word-wrap: break-word;
  }
  h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.25; margin: 20px 0 10px; }
  h1 { font-size: 2em;   border-bottom: 1px solid ${hBorder}; padding-bottom: .3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid ${hBorder}; padding-bottom: .3em; }
  h3 { font-size: 1.25em; }
  p  { margin: 10px 0; }
  a  { color: ${link}; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code {
    background: ${codeBg};
    padding: .2em .4em;
    border-radius: 6px;
    font-size: 85%;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }
  pre {
    background: ${codeBg};
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
    line-height: 1.45;
  }
  pre code { background: none; padding: 0; font-size: 13px; }
  ul, ol { padding-left: 2em; margin: 10px 0; }
  li { margin: 4px 0; }
  li p { margin: 4px 0; }
  blockquote {
    border-left: 4px solid ${border};
    padding: 0 1em;
    color: ${subText};
    margin: 10px 0;
    background: ${blockBg};
    border-radius: 0 6px 6px 0;
  }
  hr { border: none; border-top: 1px solid ${hBorder}; margin: 20px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid ${border}; padding: 8px 12px; }
  th { background: ${codeBg}; font-weight: 600; }
  tr:nth-child(even) { background: ${codeBg}; }
  img { max-width: 100%; height: auto; border-radius: 4px; }
  strong { font-weight: 600; }
  em { font-style: italic; }
  /* GitHub align support */
  [align="center"] { text-align: center; }
  [align="left"]   { text-align: left; }
  [align="right"]  { text-align: right; }
  div[align="center"] img, p[align="center"] img { display: inline-block; }
</style>
</head>
<body>
<div id="content"></div>
<script>
  var raw = ${JSON.stringify(raw)};
  try {
    marked.setOptions({ gfm: true, breaks: true });
    document.getElementById('content').innerHTML = marked.parse(raw);
  } catch(e) {
    document.getElementById('content').innerHTML = '<pre>' + raw + '</pre>';
  }
<\/script>
</body>
</html>`;
};

// ─── Project Detail Bottom Sheet ──────────────────────────────────────────────
function ProjectSheet({ project, visible, onClose, colors, isDark }) {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withTiming(0, { duration: 320 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 280 }, () => {
        runOnJS(setShow)(false);
      });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!show || !project) return null;

  const readmeHtml = buildReadmeHtml(project.readme || project.content || 'İçerik bulunamadı.', isDark);

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[sheetStyles.backdrop, backdropStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          sheetStyles.sheet,
          { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + 16 },
          sheetStyle,
        ]}
      >
        {/* Handle */}
        <View style={sheetStyles.handle} />

        {/* Header */}
        <View style={[sheetStyles.sheetHeader, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[sheetStyles.sheetTitle, { color: colors.textMain }]} numberOfLines={2}>
              {project.title || 'Proje Detayı'}
            </Text>
            <Text style={[sheetStyles.sheetDate, { color: colors.textSub }]}>
              {formatTimeAgo(project.createdAt)}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[sheetStyles.closeBtn, { backgroundColor: colors.background }]}>
            <Text style={{ color: colors.textMain, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* GitHub Link */}
        {!!project.githubUrl && (
          <TouchableOpacity
            style={[sheetStyles.githubBtn, { backgroundColor: isDark ? '#1E1E2D' : '#F0F0F0', borderColor: colors.border }]}
            onPress={() => Linking.openURL(project.githubUrl)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔗</Text>
            <Text style={[sheetStyles.githubText, { color: colors.primary }]} numberOfLines={1}>
              {project.githubUrl}
            </Text>
          </TouchableOpacity>
        )}

        {/* Proje Fotoğrafları */}
        {project.photos?.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 10 }}>
            <Text style={[sheetStyles.codeLabel, { color: colors.textSub, marginBottom: 8 }]}>UYGULAMA EKRAN GÖRÜNTÜLERİ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {project.photos.map((url, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => Linking.openURL(url)}
                >
                  <Image
                    source={{ uri: url }}
                    style={{
                      width: 120,
                      height: 200,
                      borderRadius: 12,
                      marginRight: 10,
                      backgroundColor: colors.border,
                      resizeMode: 'cover',
                    }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* README WebView */}
        <WebView
          source={{ html: readmeHtml }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(req) => {
            if (req.url !== 'about:blank' && req.url.startsWith('http')) {
              Linking.openURL(req.url);
              return false;
            }
            return true;
          }}
        />

        {/* Code Snippet */}
        {!!project.codeSnippet && (
          <View style={[sheetStyles.codeBlock, { backgroundColor: isDark ? '#1E1E2D' : '#F0F0F0', borderColor: colors.border }]}>
            <Text style={[sheetStyles.codeLabel, { color: colors.textSub }]}>KOD PARÇASI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={[sheetStyles.codeText, { color: isDark ? '#A8FF78' : '#333' }]}>
                {project.codeSnippet}
              </Text>
            </ScrollView>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Main ProfilePage ──────────────────────────────────────────────────────────
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
  const [selectedProject, setSelectedProject] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [overscrollBlur, setOverscrollBlur] = useState(0);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [optionsItem, setOptionsItem] = useState(null);
  const [menuAnchorY, setMenuAnchorY] = useState(0);
  const scrollY = useSharedValue(0);

  const updateBlur = useCallback((y) => {
    setOverscrollBlur(y < 0 ? Math.min(80, Math.abs(y) * 1.5) : 0);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      runOnJS(updateBlur)(y);
    },
  });

  const bannerAnimatedStyle = useAnimatedStyle(() => {
    const d = Math.max(0, -scrollY.value);
    return {
      height: 190 + d,
      marginTop: -d,
    };
  });

  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const themeMode = useSelector(state => state.theme?.mode || 'light');
  const isDark = themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  const styles = getStyles(colors);

  const { userId } = route.params;
  const loggedInUserId = useSelector(state => state.user.userId);
  const isOwnProfile = userId === loggedInUserId;

  const handleOptionsPress = (item, pageY) => {
    setMenuAnchorY(pageY || 0);
    setOptionsItem({ ...item, _tab: selectedTab });
  };

  const handleDeleteItem = async () => {
    const item = optionsItem;
    setOptionsItem(null);
    if (!item) return;
    try {
      if (item._tab === 'Blog') {
        await deleteDoc(doc(db, 'Users', userId, 'blog', item.id));
      } else if (item._tab === 'Projeler') {
        await deleteDoc(doc(db, 'Users', userId, 'projects', item.id));
      } else if (item._tab === 'Postlar') {
        if (item.mediaUri) {
          await deleteFromCloudinary(item.mediaUri, item.mediaType || 'image');
        }
        await deleteDoc(doc(db, 'Posts', item.id));
      }
      Alert.alert('Başarılı', 'Başarıyla silindi.');
      fetchTabData();
    } catch (e) {
      console.error('Silme hatası:', e);
      Alert.alert('Hata', 'Silme işlemi sırasında bir hata oluştu.');
    }
  };

  const handleReportItem = () => {
    setOptionsItem(null);
    Alert.alert('Bildirildi', 'Gönderi başarıyla bildirildi.');
  };

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
        data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } else if (selectedTab === 'Projeler') {
        const snapshot = await getDocs(collection(db, 'Users', userId, 'projects'));
        data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } else if (selectedTab === 'Postlar') {
        const snapshot = await getDocs(query(collection(db, 'Posts'), where('userId', '==', userId)));
        data = await Promise.all(snapshot.docs.map(async d => {
          const postData = d.data();
          return {
            id: d.id,
            ...postData,
            profileImageUrl: userData?.profileImageUrl || null,
            userName: userData?.fullName || 'İsimsiz',
            liked: postData.likedBy?.includes(loggedInUserId) || false,
            repeated: postData.repeatedBy?.includes(loggedInUserId) || false,
            likesCount: postData.likedBy?.length || 0,
            repeatsCount: postData.repeatedBy?.length || 0,
            commentsCount: postData.comments?.length || 0,
          };
        }));
      }
      setTabData(data);
    } catch (e) { setTabData([]); }
  };

  useEffect(() => { fetchUser(); }, [userId]);
  useEffect(() => { fetchTabData(); }, [selectedTab, userId]);
  useEffect(() => {
    if (userData?.company) getCompanyLogoUri(userData.company).then(setCompanyLogoUri);
    if (userData?.school) getSchoolLogoUri(userData.school).then(setSchoolLogoUri);
  }, [userData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchUser(), fetchTabData()]).then(() => setRefreshing(false));
  }, [userId, selectedTab]);

  const handlePostAction = async (postId, field, isActive) => {
    if (!loggedInUserId) return;
    const postRef = doc(db, 'Posts', postId);
    try {
      await updateDoc(postRef, {
        [field]: isActive ? arrayRemove(loggedInUserId) : arrayUnion(loggedInUserId)
      });
      fetchTabData();
    } catch (error) { console.error(`${field} hatası:`, error); }
  };

  const toggleExpand = (postId) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const openProjectSheet = (project) => {
    setSelectedProject(project);
    setSheetVisible(true);
  };

  const closeProjectSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSelectedProject(null), 350);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />}
      >
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Image source={require('../../assets/images/back.png')} style={styles.iconBack} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('ProfileEdit')} style={styles.headerBtn}>
            <Image source={require('../../assets/images/userEdit.png')} style={styles.iconEdit} />
          </Pressable>
        </View>

        {/* Banner + Avatar Section */}
        <Animated.View style={[styles.bannerContainer, bannerAnimatedStyle]}>
          {userData.backProfileImageUrl ? (
            <Image
              source={{ uri: userData.backProfileImageUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.bannerPlaceholder} />
          )}
          {overscrollBlur > 0 && (
            <BlurView
              intensity={overscrollBlur}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
        </Animated.View>

        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={userData.profileImageUrl ? { uri: userData.profileImageUrl } : require('../../assets/images/ProfileSquare.png')}
              style={styles.avatar}
            />
          </View>
          <View style={styles.nameContainer}>
            <BlurView
              intensity={60}
              tint={themeMode === 'dark' ? 'dark' : 'light'}
              style={styles.nameBlur}
            >
              <Text style={styles.nameText} numberOfLines={1}>{userData.fullName || 'İsimsiz'}</Text>
            </BlurView>
            <Text style={styles.jobText} numberOfLines={1}>{userData.profession || 'Meslek yok'}</Text>
            <View style={styles.infoRow}>
              {schoolLogoUri ? (
                <View style={styles.logoContainer}>
                  <Image source={{ uri: schoolLogoUri }} style={styles.miniLogo} resizeMode="contain" />
                </View>
              ) : null}
              <Text style={styles.infoSubText} numberOfLines={1}>{userData.school || 'Okul Belirtilmedi'}</Text>
            </View>
          </View>
        </View>

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
            {companyLogoUri ? (
              <View style={styles.logoContainer}>
                <Image source={{ uri: companyLogoUri }} style={styles.miniLogo} resizeMode="contain" />
              </View>
            ) : null}
            <Text style={styles.infoSubText} numberOfLines={1}>{userData.company || 'Şirket yok'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={[styles.paddingArea, { paddingTop: 6, paddingBottom: 6 }]}>
          <Text style={styles.sectionLabel}>Hakkımda</Text>
          <Text style={styles.bioText}>{userData.bio || 'Henüz bir açıklama eklenmedi.'}</Text>
        </View>

        <View style={styles.tabBar}>
          {['Blog', 'Projeler', 'Postlar'].map(tab => (
            <Pressable key={tab} onPress={() => setSelectedTab(tab)} style={[styles.tabItem, selectedTab === tab && styles.activeTab]}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        <View style={selectedTab === 'Postlar' ? { paddingTop: 15, paddingBottom: 20 } : styles.paddingArea}>
          {tabData.length > 0 ? tabData.map(item => {
            if (selectedTab === 'Postlar') {
              const isExpanded = expandedPosts[item.id];
              const hasMedia = !!(item.mediaUri && item.mediaUri.length > 5);
              const displayContent = (item.content?.length > 100 && !isExpanded)
                ? item.content.substring(0, 100) + '...'
                : item.content;
              return (
                <View key={item.id} style={[styles.postCard]}>
                  <View style={styles.postCardHeader}>
                    <Image
                      source={
                        item.profileImageUrl && item.profileImageUrl.length > 0
                          ? { uri: item.profileImageUrl }
                          : require('../../assets/images/ProfileSquare.png')
                      }
                      style={styles.postCardAvatar}
                    />
                    <View style={styles.postCardHeaderText}>
                      <Text style={styles.postCardName}>{item.userName}</Text>
                      <Text style={styles.postCardTime}>{moment(item.createdAt?.seconds * 1000).fromNow()} • 🌎</Text>
                    </View>
                    {isOwnProfile && (
                      <TouchableOpacity style={styles.cardOptionsBtn} onPress={(event) => handleOptionsPress(item, event.nativeEvent.pageY)}>
                        <Text style={styles.cardOptionsText}>···</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {displayContent ? (
                    <View style={styles.postCardContent}>
                      <Text style={styles.postCardText}>
                        {displayContent}
                        {item.content?.length > 100 && (
                          <Text onPress={() => toggleExpand(item.id)} style={styles.postMoreText}>
                            {isExpanded ? ' Daha Az' : ' ...daha fazla'}
                          </Text>
                        )}
                      </Text>
                    </View>
                  ) : null}

                  {hasMedia && (
                    <View style={styles.postMediaWrapper}>
                      {item.mediaType === 'image' ? (
                        <Image source={{ uri: item.mediaUri }} style={styles.postMediaContent} resizeMode="cover" />
                      ) : (
                        <VideoPlayer videoUri={item.mediaUri} style={styles.postMediaContent} />
                      )}
                    </View>
                  )}

                  <View style={styles.postCardActions}>
                    <TouchableOpacity
                      style={styles.postActionBtn}
                      onPress={() => handlePostAction(item.id, 'likedBy', item.liked)}
                    >
                      <Image
                        source={item.liked ? require('../../assets/images/RedLike.png') : require('../../assets/images/Heart.png')}
                        style={[styles.postActionIcon, { tintColor: item.liked ? '#FF4B4B' : colors.iconTint }]}
                      />
                      <Text style={[styles.postActionLabel, item.liked && { color: '#FF4B4B' }]}>
                        {item.likesCount > 0 ? item.likesCount : ''} Beğeni
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.postActionBtn}
                      onPress={() => { setActivePostId(item.id); setCommentModalVisible(true); }}
                    >
                      <Image source={require('../../assets/images/Comment.png')} style={[styles.postActionIcon, { tintColor: colors.iconTint }]} />
                      <Text style={styles.postActionLabel}>Yorum</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.postActionBtn}
                      onPress={() => handlePostAction(item.id, 'repeatedBy', item.repeated)}
                    >
                      <Image
                        source={item.repeated ? require('../../assets/images/PinkRepeat.png') : require('../../assets/images/Repeat.png')}
                        style={[styles.postActionIcon, { tintColor: item.repeated ? '#00BA7C' : colors.iconTint }]}
                      />
                      <Text style={[styles.postActionLabel, item.repeated && { color: '#00BA7C' }]}>Repost</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.postActionBtn}>
                      <Image source={require('../../assets/images/Share.png')} style={[styles.postActionIcon, { tintColor: colors.iconTint }]} />
                      <Text style={styles.postActionLabel}>Gönder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            // Blog & Projeler cards
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  {isOwnProfile && (
                    <TouchableOpacity style={styles.cardOptionsBtn} onPress={(event) => handleOptionsPress(item, event.nativeEvent.pageY)}>
                      <Text style={styles.cardOptionsText}>···</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.cardContent} numberOfLines={3}>
                  {selectedTab === 'Projeler' ? (item.readme || 'Açıklama yok') : item.content}
                </Text>
                {selectedTab === 'Projeler' && !!item.githubUrl && (
                  <Text style={[styles.githubLink]} numberOfLines={1}>🔗 {item.githubUrl}</Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>{formatTimeAgo(item.createdAt)}</Text>
                  {selectedTab === 'Projeler' && (
                    <TouchableOpacity onPress={() => openProjectSheet(item)} activeOpacity={0.7}>
                      <Text style={styles.moreBtn}>Detayları Gör →</Text>
                    </TouchableOpacity>
                  )}
                  {selectedTab === 'Blog' && (
                    <Text style={styles.moreBtn}>Devamını Oku →</Text>
                  )}
                </View>
              </View>
            );
          }) : (
            <Text style={styles.emptyText}>Henüz bir içerik bulunmuyor.</Text>
          )}
        </View>
      </Animated.ScrollView>

      {/* Project Detail Sheet */}
      <ProjectSheet
        project={selectedProject}
        visible={sheetVisible}
        onClose={closeProjectSheet}
        colors={colors}
        isDark={isDark}
      />
      <CommentModal
        visible={commentModalVisible}
        onClose={() => { setCommentModalVisible(false); setActivePostId(null); }}
        postId={activePostId}
        currentUserId={loggedInUserId}
      />
      <PostOptionsMenu
        visible={!!optionsItem}
        isOwnPost={isOwnProfile}
        onDelete={handleDeleteItem}
        onReport={handleReportItem}
        onClose={() => setOptionsItem(null)}
        anchorY={menuAnchorY}
      />
    </View>
  );
}

// ─── Sheet Styles ──────────────────────────────────────────────────────────────
const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  sheetDate: {
    fontSize: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  githubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  githubText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  codeBlock: {
    margin: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    maxHeight: 160,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  codeText: {
    fontFamily: 'Courier New',
    fontSize: 13,
    lineHeight: 20,
  },
});

// ─── Page Styles ───────────────────────────────────────────────────────────────
const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerTitle: { color: colors.textMain, fontSize: 18, fontWeight: 'bold' },
  iconBack: { width: 24, height: 24, resizeMode: 'contain', tintColor: 'white' },
  iconEdit: { width: 20, height: 20, tintColor: 'white' },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  editBtn: { backgroundColor: colors.cardBackground, padding: 10, borderRadius: 50},

  bannerContainer: {
    width: '100%',
    height: 190,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
  },
  profileSection: { flexDirection: 'row', paddingHorizontal: 20, alignItems: 'center', marginBottom: 20, width: '100%', marginTop: -36 },
  avatarWrapper: { width: 90, height: 90, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.border, borderWidth: 3, borderColor: colors.background },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  nameContainer: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  nameBlur: { alignSelf: 'flex-start', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 2 },
  nameText: { color: colors.textMain, fontSize: 20, fontWeight: 'bold' },
  jobText: { color: colors.textSub, fontSize: 14, marginVertical: 2 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
  statsLeft: { flexDirection: 'row' },
  statItem: { marginRight: 25 },
  statValue: { color: colors.textMain, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: colors.textSub, fontSize: 12 },
  companyInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  logoContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden'
  },
  miniLogo: { width: '100%', height: '100%', },
  infoSubText: { color: colors.textSub, fontSize: 12, flex: 1 },

  paddingArea: { padding: 20 },
  sectionLabel: { color: colors.textSub, fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  bioText: { color: colors.textMain, fontSize: 14, lineHeight: 22 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginTop: 15, marginBottom: 5 },

  tabBar: { flexDirection: 'row', marginTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: colors.textMain },
  tabText: { color: colors.textSub, fontWeight: 'bold' },
  activeTabText: { color: colors.textMain },

  card: { backgroundColor: colors.cardBackground, padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.textMain, fontSize: 16, fontWeight: 'bold', flex: 1 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAuthorText: {
    color: colors.textMain,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardOptionsBtn: {
    padding: 8,
    marginRight: -8,
    marginTop: -8,
  },
  cardOptionsText: {
    color: colors.textSub,
    fontSize: 18,
    fontWeight: 'bold',
  },
  mediaWrapper: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: colors.background,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden'
  },
  mediaContent: {
    width: '100%',
    height: '100%',
  },
  cardContent: { color: colors.textSub, fontSize: 14, lineHeight: 20 },
  githubLink: { color: colors.primary, fontSize: 12, marginTop: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  dateText: { color: colors.textSub, fontSize: 11 },
  moreBtn: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: colors.textSub, textAlign: 'center', marginTop: 20 },

  // ── HomePage-style Post Card ──
  postCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 10,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  postCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  postCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postCardHeaderText: { flex: 1, justifyContent: 'center' },
  postCardName: { color: colors.textMain, fontSize: 15, fontWeight: '700' },
  postCardTime: { color: colors.textSub, fontSize: 11, marginTop: 2 },
  postCardContent: { paddingHorizontal: 15, paddingBottom: 12 },
  postCardText: { color: colors.textMain, fontSize: 14, lineHeight: 21 },
  postMoreText: { color: colors.textSub, fontSize: 14, fontWeight: '600' },
  postMediaWrapper: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: colors.background,
  },
  postMediaContent: { width: '100%', height: '100%' },
  postCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  postActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  postActionIcon: { width: 20, height: 20, resizeMode: 'contain' },
  postActionLabel: { color: colors.textSub, fontSize: 13, marginLeft: 6, fontWeight: '600' },
});