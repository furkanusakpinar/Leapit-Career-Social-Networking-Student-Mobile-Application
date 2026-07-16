import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ToastAndroid,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';
import { withTimeout } from '../utils/timeoutUtils';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  query,
  where,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCompanyLogoUri } from '../utils/getCompanyLogoUri';
import { getSchoolLogoUri } from '../utils/getSchoolLogoUri';
import axios from 'axios';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { fetchReadmeFromGithub } from '../utils/github';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import VideoPlayer from '../components/VideoPlayer';
import CommentModal from '../components/CommentModal';
import PostOptionsMenu from '../components/PostOptionsMenu';
import { deleteFromCloudinary } from '../utils/cloudinary';

const BACKEND_URL = 'http://141.11.109.234:3000';
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

const formatCount = (num) => {
  if (!num) return '0';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + ' Mr';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + ' B';
  return String(num);
};

const buildReadmeHtml = (content, isDark, colors) => {
  const bg      = colors?.cardBackground || (isDark ? '#1A1D24' : '#ffffff');
  const text    = isDark ? '#e6edf3' : '#1f2328';
  const codeBg  = isDark ? '#161b22' : '#f6f8fa';
  const border  = isDark ? '#30363d' : '#d1d9e0';
  const hBorder = isDark ? '#21262d' : '#d1d9e0';
  const blockBg = isDark ? '#161b22' : '#f6f8fa';
  const link    = colors?.primary || '#0066FF';
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

function ProjectSheet({ project, visible, onClose, colors, isDark }) {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);
  const [readmeContent, setReadmeContent] = useState((project?.readme || project?.content) || '');
  const [loading, setLoading] = useState(false);

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
  }, [visible, opacity, translateY]);

  useEffect(() => {
    if (visible && project) {
      setReadmeContent(project.readme || project.content || '');
      
      if (project.githubUrl) {
        setLoading(true);
        fetchReadmeFromGithub(project.githubUrl)
          .then((fetched) => {
            if (fetched) {
              setReadmeContent(fetched);
            }
          })
          .catch((err) => console.log('Dynamic github fetch error:', err))
          .finally(() => setLoading(false));
      }
    }
  }, [visible, project]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!show || !project) return null;

  const readmeHtml = buildReadmeHtml(readmeContent || 'İçerik bulunamadı.', isDark, colors);

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

        {/* README WebView / Loader */}
        {loading && !readmeContent ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSub, marginTop: 10, fontSize: 13 }}>GitHub&apos;dan README yükleniyor...</Text>
          </View>
        ) : (
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
        )}

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

// ─── Main OtherProfilePage ───────────────────────────────────────────────────
export default function OtherProfilePage() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const profileUserId = route.params?.userId || null;
  const currentUserId = useSelector(state => state.user.userId);
  const currentUserFullName = useSelector(state => state.user.fullName);

  const [currentUserData, setCurrentUserData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Blog');
  const [tabData, setTabData] = useState([]);
  const [isConnectionPending, setIsConnectionPending] = useState(false);
  const [connectionActionLoading, setConnectionActionLoading] = useState(false);
  const [connectionStatusLoading, setConnectionStatusLoading] = useState(true);

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
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const scrollY = useSharedValue(0);

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const isDark = themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  const styles = getStyles(colors, isDark);

  const isOwnProfile = profileUserId === currentUserId;

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
        await deleteDoc(doc(db, 'Users', profileUserId, 'blog', item.id));
      } else if (item._tab === 'Projeler') {
        await deleteDoc(doc(db, 'Users', profileUserId, 'projects', item.id));
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

  const fetchUser = useCallback(async () => {
    if (!profileUserId) {
      setUserData(null);
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'Users', profileUserId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        // Fetch follow counts from the actual subcollections
        const followersSnap = await getDocs(collection(db, 'Users', profileUserId, 'followers'));
        setFollowersCount(followersSnap.size);
        const followingSnap = await getDocs(collection(db, 'Users', profileUserId, 'following'));
        setFollowingCount(followingSnap.size);
      } else {
        setUserData(null);
      }
    } catch (e) {
      console.error('User fetch error:', e);
      setUserData(null);
    }
    setLoading(false);
  }, [profileUserId]);

  const fetchCurrentUserData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const docRef = doc(db, 'Users', currentUserId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      }
    } catch (e) {
      console.error('Current user data fetch error:', e);
    }
  }, [currentUserId]);

  const checkFollowStatus = useCallback(async () => {
    if (!currentUserId || !profileUserId) {
      setIsFollowing(false);
      return;
    }
    try {
      const followerDocRef = doc(db, 'Users', profileUserId, 'followers', currentUserId);
      const docSnap = await getDoc(followerDocRef);
      setIsFollowing(docSnap.exists());
    } catch (e) {
      console.error('Follow status check error:', e);
      setIsFollowing(false);
    }
  }, [currentUserId, profileUserId]);

  const checkExistingConnectionRequest = useCallback(async () => {
    if (!currentUserId || !profileUserId) {
      setIsConnectionPending(false);
      setConnectionStatusLoading(false);
      return;
    }
    setConnectionStatusLoading(true);
    try {
      const q = query(
        collection(db, 'connectionRequests'),
        where('senderUserId', '==', currentUserId),
        where('receiverUserId', '==', profileUserId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      setIsConnectionPending(!querySnapshot.empty);
    } catch (_) {
      setIsConnectionPending(false);
    } finally {
      setConnectionStatusLoading(false);
    }
  }, [currentUserId, profileUserId]);

  const fetchTabData = useCallback(async () => {
    try {
      let data = [];
      if (selectedTab === 'Blog') {
        const snapshot = await getDocs(collection(db, 'Users', profileUserId, 'blog'));
        let isFollowingProfile = false;
        if (currentUserId && currentUserId !== profileUserId) {
          const followSnap = await getDoc(doc(db, 'Users', currentUserId, 'following', profileUserId));
          isFollowingProfile = followSnap.exists();
        }
        data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(item => {
            const visibility = item.visibility || 'everyone';
            if (visibility === 'only_me') return false; // Ziyaretçilere asla gösterme
            if (visibility === 'friends') return isFollowingProfile;
            return true;
          });
      } else if (selectedTab === 'Projeler') {
        const snapshot = await getDocs(collection(db, 'Users', profileUserId, 'projects'));
        let isFollowingProfile = false;
        if (currentUserId && currentUserId !== profileUserId) {
          const followSnap = await getDoc(doc(db, 'Users', currentUserId, 'following', profileUserId));
          isFollowingProfile = followSnap.exists();
        }
        data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(item => {
            const visibility = item.visibility || 'everyone';
            if (visibility === 'only_me') return false;
            if (visibility === 'friends') return isFollowingProfile;
            return true;
          });
      } else if (selectedTab === 'Postlar') {
        const snapshot = await getDocs(query(collection(db, 'Posts'), where('userId', '==', profileUserId)));
        
        let isFollowingProfile = false;
        if (currentUserId && currentUserId !== profileUserId) {
          const followSnap = await getDoc(doc(db, 'Users', currentUserId, 'following', profileUserId));
          isFollowingProfile = followSnap.exists();
        }

        const filteredDocs = snapshot.docs.filter(d => {
          const postData = d.data();
          const visibility = postData.visibility || 'everyone';

          // only_me postlar ziyaretçilere HİÇ gösterilmez
          if (visibility === 'only_me') return false;
          // friends postlar sadece takipçilere görünür
          if (visibility === 'friends') return isFollowingProfile;
          return true;
        });

        data = await Promise.all(filteredDocs.map(async d => {
          const postData = d.data();
          return {
            id: d.id,
            ...postData,
            profileImageUrl: userData?.profileImageUrl || null,
            userName: userData?.fullName || 'İsimsiz',
            liked: postData.likedBy?.includes(currentUserId) || false,
            repeated: postData.repeatedBy?.includes(currentUserId) || false,
            likesCount: postData.likedBy?.length || 0,
            repeatsCount: postData.repeatedBy?.length || 0,
            commentsCount: postData.comments?.length || 0,
          };
        }));
      }
      setTabData(data);
    } catch (e) {
      console.error(`${selectedTab} verisi alınırken hata:`, e);
      setTabData([]);
    }
  }, [selectedTab, profileUserId, userData, currentUserId]);

  useEffect(() => {
    fetchUser();
    fetchCurrentUserData();
    checkFollowStatus();
    checkExistingConnectionRequest();
  }, [profileUserId, currentUserId, checkFollowStatus, checkExistingConnectionRequest, fetchCurrentUserData, fetchUser]);

  useEffect(() => {
    fetchTabData();
  }, [selectedTab, profileUserId, userData, fetchTabData]);

  useEffect(() => {
    if (userData?.company) getCompanyLogoUri(userData.company).then(setCompanyLogoUri);
    if (userData?.school) getSchoolLogoUri(userData.school).then(setSchoolLogoUri);
  }, [userData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchUser(),
      fetchCurrentUserData(),
      fetchTabData(),
      checkFollowStatus(),
      checkExistingConnectionRequest()
    ]).then(() => setRefreshing(false));
  }, [checkFollowStatus, checkExistingConnectionRequest, fetchCurrentUserData, fetchUser, fetchTabData]);

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      ToastAndroid.show('Takip etmek için giriş yapmalısınız.', ToastAndroid.LONG);
      return;
    }
    if (currentUserId === profileUserId) {
      ToastAndroid.show('Kendi profilinizi takip edemezsiniz.', ToastAndroid.LONG);
      return;
    }

    setFollowLoading(true);
    try {
      const followedUserRef = doc(db, 'Users', profileUserId);
      const currentUserRef = doc(db, 'Users', currentUserId);

      const followerDocRef = doc(db, 'Users', profileUserId, 'followers', currentUserId);
      const currentUserFollowingDocRef = doc(db, 'Users', currentUserId, 'following', profileUserId);

      const followerName = currentUserFullName || currentUserData?.fullName || 'Bilinmeyen Kullanıcı';
      const timeoutMs = 15000; 

      if (isFollowing) {
        await withTimeout(deleteDoc(followerDocRef), timeoutMs);
        await withTimeout(deleteDoc(currentUserFollowingDocRef), timeoutMs);

        await withTimeout(updateDoc(followedUserRef, {
          followersCount: increment(-1),
        }), timeoutMs);

        await withTimeout(updateDoc(currentUserRef, {
          followingCount: increment(-1),
        }), timeoutMs);

        // Delete the follow notification from the target user's notifications collection
        try {
          const notificationsRef = collection(db, 'Users', profileUserId, 'notifications');
          const qNotif = query(
            notificationsRef,
            where('type', '==', 'follow'),
            where('sourceUserId', '==', currentUserId)
          );
          const querySnapshot = await getDocs(qNotif);
          querySnapshot.forEach(async (d) => {
            await deleteDoc(doc(db, 'Users', profileUserId, 'notifications', d.id));
          });
        } catch (notifErr) {
          console.log("Bildirim silinemedi veya bulunamadı:", notifErr);
        }

        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        ToastAndroid.show(`${userData.fullName} adlı kişiyi takip etmeyi bıraktınız.`, ToastAndroid.LONG);
      } else {
        await withTimeout(setDoc(followerDocRef, {
          followerId: currentUserId,
          followedAt: new Date(),
        }), timeoutMs);
        await withTimeout(setDoc(currentUserFollowingDocRef, {
          followedUserId: profileUserId,
          followedAt: new Date(),
        }), timeoutMs);

        await withTimeout(updateDoc(followedUserRef, {
          followersCount: increment(1),
        }), timeoutMs);

        await withTimeout(updateDoc(currentUserRef, {
          followingCount: increment(1),
        }), timeoutMs);

        const notificationData = {
          type: 'follow', 
          content: `${followerName} seni takip etmeye başladı.`,
          isRead: false,
          createdAt: new Date(),
          sourceUserId: currentUserId, 
        };

        const notificationRef = doc(collection(db, 'Users', profileUserId, 'notifications'));
        
        try {
          await withTimeout(setDoc(notificationRef, notificationData), 5000);
        } catch (noteError) {
          console.log("Bildirim gönderilmedi:", noteError);
        }

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        ToastAndroid.show(`${userData.fullName} adlı kişiyi takip etmeye başladınız.`, ToastAndroid.LONG);
      }
      fetchUser();
    } catch (e) {
      console.error('Takip işlemi hatası:', e);
      ToastAndroid.show('Takip işlemi sırasında bir sorun oluştu.', ToastAndroid.LONG);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessageUser = () => {
    navigation.navigate('SendMessage', {
      recipientId: profileUserId,
      recipientName: userData.fullName,
      recipientJob: userData.job || userData.profession,
      recipientProfileImageUrl: userData.profileImageUrl,
    });
  };

  const sendNewConnectionRequest = async () => {
    if (!currentUserId || !userData) {
      ToastAndroid.show('Hata: Bağlantı isteği göndermek için giriş yapmalısınız veya profiliniz eksik.', ToastAndroid.LONG);
      return;
    }
    if (currentUserId === profileUserId) {
      ToastAndroid.show('Kendi profilinize bağlantı isteği gönderemezsiniz.', ToastAndroid.LONG);
      return;
    }

    setConnectionActionLoading(true);
    try {
      await addDoc(collection(db, 'connectionRequests'), {
        senderUserId: currentUserId,
        senderUserName: currentUserData?.username || currentUserData?.fullName || 'Anonim',
        senderUserJob: currentUserData?.job || currentUserData?.profession || 'Bilinmiyor',
        senderProfileImageUrl: currentUserData?.profileImageUrl || null,
        receiverUserId: profileUserId,
        receiverUserName: userData.fullName || userData.username || 'Anonim',
        receiverUserJob: userData.job || userData.profession || 'Bilinmiyor',
        receiverProfileImageUrl: userData.profileImageUrl || null,
        status: 'pending',
        timestamp: serverTimestamp(),
      });

      ToastAndroid.show('Bağlantı isteğiniz başarıyla gönderildi!', ToastAndroid.LONG);
      setIsConnectionPending(true);
    } catch (error) {
      console.error('Bağlantı isteği gönderilirken hata oluştu:', error.message);
      ToastAndroid.show('Bağlantı isteği oluşturulurken bir hata oluştu: ' + error.message, ToastAndroid.LONG);
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const withdrawConnectionRequest = async () => {
    if (!currentUserId || !profileUserId) {
      ToastAndroid.show('Hata: Bağlantı isteğini geri çekmek için giriş yapmalısınız.', ToastAndroid.LONG);
      return;
    }
    setConnectionActionLoading(true);
    try {
      const q = query(
        collection(db, 'connectionRequests'),
        where('senderUserId', '==', currentUserId),
        where('receiverUserId', '==', profileUserId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        for (const docSnap of querySnapshot.docs) {
          await updateDoc(doc(db, 'connectionRequests', docSnap.id), {
            status: 'canceled'
          });
        }
        ToastAndroid.show('Bağlantı isteği başarıyla geri çekildi.', ToastAndroid.LONG);
        setIsConnectionPending(false); 
      } else {
        ToastAndroid.show('İptal edilecek bekleyen bir bağlantı isteği bulunamadı.', ToastAndroid.LONG);
      }
    } catch (error) {
      console.error('Bağlantı isteği geri çekilirken hata oluştu:', error.message);
      ToastAndroid.show('Bağlantı isteği geri çekilirken bir hata oluştu: ' + error.message, ToastAndroid.LONG);
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const handleConnectionToggle = () => {
    if (isConnectionPending) {
      withdrawConnectionRequest();
    } else {
      sendNewConnectionRequest();
    }
  };

  const handlePostAction = async (postId, field, isActive) => {
    if (!currentUserId) return;
    const postRef = doc(db, 'Posts', postId);
    try {
      await updateDoc(postRef, {
        [field]: isActive ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Kullanıcı bulunamadı.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.goBackButton}>
          <Text style={styles.goBackButtonText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

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
          <Pressable 
            onPress={() => {
              const cvLink = userData?.cvUrl || userData?.cv;
              if (cvLink) {
                // Ensure URL starts with http:// or https://
                const targetUrl = cvLink.startsWith('http://') || cvLink.startsWith('https://') 
                  ? cvLink 
                  : `https://${cvLink}`;
                Linking.openURL(targetUrl).catch(err => {
                  Alert.alert("Hata", "CV bağlantısı açılamadı. Lütfen geçerli bir URL olduğundan emin olun.");
                });
              } else {
                Alert.alert("Bilgi", "Bu kullanıcının henüz yüklenmiş bir CV bağlantısı bulunmamaktadır.");
              }
            }} 
            style={styles.headerBtn}
          >
            <Image source={require('../../assets/images/CV.png')} style={styles.iconEdit} />
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
            {!!userData.userLocation && (
              <View style={[styles.locationRow, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textSub} style={{ marginRight: 3 }} />
                  <Text style={styles.infoSubText} numberOfLines={1}>{userData.userLocation}</Text>
                </View>
                {(!!userData.githubLink || !!userData.instagramLink) && (
                  <TouchableOpacity
                    onPress={() => setContactMenuVisible(v => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="link-variant" size={12} color={colors.textSub} style={{ marginRight: 3 }} />
                    <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '600' }}>İletişim</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statsLeft}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(followersCount)}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(followingCount)}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </View>
          </View>
          <View style={styles.companyInfo}>
            {schoolLogoUri ? (
              <View style={styles.logoContainer}>
                <Image source={{ uri: schoolLogoUri }} style={styles.miniLogo} resizeMode="contain" />
              </View>
            ) : null}
            {!!userData.school && (
              <Text style={[styles.infoSubText, { marginRight: 10 }]} numberOfLines={1}>{userData.school}</Text>
            )}
            {companyLogoUri ? (
              <View style={styles.logoContainer}>
                <Image source={{ uri: companyLogoUri }} style={styles.miniLogo} resizeMode="contain" />
              </View>
            ) : null}
            <Text style={styles.infoSubText} numberOfLines={1}>{userData.company || 'Şirket yok'}</Text>
          </View>
        </View>

        {/* İletişim Bilgileri Popup */}
        {contactMenuVisible && (!!userData.githubLink || !!userData.instagramLink) && (
          <Pressable
            style={{ ...StyleSheet.absoluteFillObject, zIndex: 99 }}
            onPress={() => setContactMenuVisible(false)}
          >
            <View
              style={{
                position: 'absolute',
                top: 135,
                right: 20,
                backgroundColor: colors.cardBackground,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 6,
                minWidth: 180,
                zIndex: 100,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {!!userData.githubLink && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: userData.instagramLink ? 1 : 0, borderBottomColor: colors.border }}
                  onPress={() => { setContactMenuVisible(false); Linking.openURL(userData.githubLink); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-github" size={20} color={colors.textMain} style={{ marginRight: 12 }} />
                  <Text style={{ color: colors.textMain, fontSize: 14, fontWeight: '600' }}>GitHub</Text>
                </TouchableOpacity>
              )}
              {!!userData.instagramLink && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
                  onPress={() => { setContactMenuVisible(false); Linking.openURL(userData.instagramLink); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-instagram" size={20} color="#E1306C" style={{ marginRight: 12 }} />
                  <Text style={{ color: colors.textMain, fontSize: 14, fontWeight: '600' }}>Instagram</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        )}

        <View style={styles.divider} />

        <View style={[styles.paddingArea, { paddingTop: 6, paddingBottom: 6 }]}>
          <Text style={styles.sectionLabel}>Hakkımda</Text>
          <Text style={styles.bioText}>{userData.bio || 'Henüz bir açıklama eklenmedi.'}</Text>
        </View>

        {currentUserId !== profileUserId && (
          <View style={styles.buttonContainer}>
            <Pressable
              style={[
                styles.connectionButton,
                isConnectionPending ? styles.withdrawConnectionButton : styles.sendConnectionButton,
              ]}
              onPress={handleConnectionToggle}
              disabled={connectionActionLoading || connectionStatusLoading}
            >
              {connectionActionLoading || connectionStatusLoading ? (
                <ActivityIndicator size="small" color={isConnectionPending ? colors.textSub : 'white'} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons 
                    name={isConnectionPending ? "account-clock-outline" : "account-plus"} 
                    size={16} 
                    color={isConnectionPending ? colors.textSub : 'white'} 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={[
                    styles.connectionButtonText,
                    isConnectionPending && styles.withdrawConnectionButtonText
                  ]}>
                    {isConnectionPending ? 'İstek Gönderildi' : 'Bağlantı kur'}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={[styles.followButton, isFollowing ? styles.unfollowButton : styles.followButtonBorder]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? colors.textSub : colors.primary} />
              ) : (
                <Text style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
                  {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
                </Text>
              )}
            </Pressable>

            <Pressable style={styles.messageButton} onPress={handleMessageUser}>
              <Text style={styles.messageButtonText}>Mesaj</Text>
            </Pressable>
          </View>
        )}

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
                    <TouchableOpacity style={styles.cardOptionsBtn} onPress={(event) => handleOptionsPress(item, event.nativeEvent.pageY)}>
                      <Text style={styles.cardOptionsText}>···</Text>
                    </TouchableOpacity>
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
                  <TouchableOpacity style={styles.cardOptionsBtn} onPress={(event) => handleOptionsPress(item, event.nativeEvent.pageY)}>
                    <Text style={styles.cardOptionsText}>···</Text>
                  </TouchableOpacity>
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
        currentUserId={currentUserId}
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

// ─── Sheet Styles (Copied from ProfilePage.js) ────────────────────────────────
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

// ─── Page Styles (Merged ProfilePage & OtherProfilePage styles) ───────────────
const getStyles = (colors, isDark) => StyleSheet.create({
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
  nameContainer: { flex: 1, marginLeft: 15, justifyContent: 'center', marginTop: -10 },
  nameBlur: { alignSelf: 'flex-start', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 5 },
  nameText: { color: colors.textMain, fontSize: 20, fontWeight: 'bold' },
  jobText: { color: colors.textSub, fontSize: 14, marginVertical: 2 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
  statsLeft: { flexDirection: 'row' },
  statItem: { marginRight: 25, alignItems: 'center' },
  statValue: { color: colors.textMain, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  statLabel: { color: colors.textSub, fontSize: 12, textAlign: 'center' },
  companyInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
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

  tabBar: { flexDirection: 'row', marginTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: colors.textMain },
  tabText: { color: colors.textSub, fontWeight: 'bold', textAlign: 'center' },
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

  // OtherProfile specific connection/follow button styling
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 18,
    marginHorizontal: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  connectionButton: {
    flex: 1.3,
    flexDirection: 'row',
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendConnectionButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  withdrawConnectionButton: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectionButtonIcon: {
    width: 14,
    height: 14,
    tintColor: 'white',
    marginRight: 6,
    resizeMode: 'contain',
  },
  connectionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  withdrawConnectionButtonText: {
    color: colors.textSub,
  },
  followButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonBorder: {
    backgroundColor: isDark ? 'rgba(0, 102, 255, 0.15)' : 'rgba(0, 102, 255, 0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(0, 102, 255, 0.3)' : 'rgba(0, 102, 255, 0.15)',
  },
  followButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  unfollowButton: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  unfollowButtonText: {
    color: colors.textSub,
  },
  messageButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageButtonText: {
    color: colors.textMain,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  notFoundText: {
    color: '#FF6347',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 22,
    fontWeight: 'bold',
    backgroundColor: colors.cardBackground,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF6347',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  goBackButton: {
    marginTop: 30,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  goBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});