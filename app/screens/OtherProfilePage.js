import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
  Linking,
  ScrollView,
  Animated as RNAnimated,
  Modal,
  TextInput,
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
import Toast from 'react-native-toast-message';
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
import { PanGestureHandler } from 'react-native-gesture-handler';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import VideoPlayer from '../components/VideoPlayer';
import CommentModal from '../components/CommentModal';
import PostOptionsMenu from '../components/PostOptionsMenu';
import BottomSheet from '../components/BottomSheet';
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

const truncateString = (str, maxLength) => {
  if (!str) return '';
  return str.length <= maxLength ? str : str.substring(0, maxLength - 3) + '...';
};

const PostCardActionButton = ({ iconComponent, onPress, isActive, activeColor, inactiveColor, label, s }) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const handlePress = () => {
    RNAnimated.sequence([
      RNAnimated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      RNAnimated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Pressable style={s.actionButton} onPress={handlePress}>
      <RNAnimated.View style={[s.actionIconContainer, { transform: [{ scale: scaleAnim }] }]}>
        {iconComponent({ color: isActive ? activeColor : inactiveColor, size: 24 })}
      </RNAnimated.View>
      {label && <Text style={s.actionLabel}>{label}</Text>}
    </Pressable>
  );
};

const PostCardActions = ({ item, colors, s, onPostAction, onCommentPress, hasMedia }) => {
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num || 0;
  };

  return (
    <View>
      {!hasMedia && <View style={s.divider} />}
      <View style={s.cardActions}>
        <View style={s.cardActionsLeft}>
          <PostCardActionButton
            iconComponent={(props) => <MaterialCommunityIcons name={item.liked ? 'heart' : 'heart-outline'} {...props} />}
            isActive={item.liked} activeColor="#FF4B4B" inactiveColor={colors.iconTint}
            label={item.likesCount > 0 ? formatNumber(item.likesCount) : ''} s={s}
            onPress={() => onPostAction(item.id, 'likedBy', item.liked)}
          />
          <PostCardActionButton
            iconComponent={(props) => (
              <Image
                source={require('../../assets/images/Comment.png')}
                style={{ width: props.size, height: props.size, tintColor: props.color }}
                resizeMode="contain"
              />
            )}
            inactiveColor={colors.iconTint}
            label={item.commentsCount > 0 ? formatNumber(item.commentsCount) : ''} s={s}
            onPress={() => onCommentPress(item.id)}
          />
          <PostCardActionButton
            iconComponent={(props) => (
              <Image
                source={require('../../assets/images/Repost.png')}
                style={{ width: props.size, height: props.size, tintColor: props.color }}
                resizeMode="contain"
              />
            )}
            isActive={item.repeated} activeColor="#00BA7C" inactiveColor={colors.iconTint}
            label={item.repeatsCount > 0 ? formatNumber(item.repeatsCount) : ''} s={s}
            onPress={() => onPostAction(item.id, 'repeatedBy', item.repeated)}
          />
        </View>
        <PostCardActionButton
          iconComponent={(props) => (
            <Image
              source={require('../../assets/images/Send.png')}
              style={{ width: props.size, height: props.size, tintColor: props.color }}
              resizeMode="contain"
            />
          )}
          inactiveColor={colors.iconTint}
          s={s}
          onPress={() => {}}
        />
      </View>
    </View>
  );
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
  const [readmeContent, setReadmeContent] = useState((project?.readme || project?.content) || '');
  const [loading, setLoading] = useState(false);

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

  if (!project) return null;

  const readmeHtml = buildReadmeHtml(readmeContent || 'İçerik bulunamadı.', isDark, colors);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={project.title || 'Proje Detayı'}
      subtitle={formatTimeAgo(project.createdAt)}
      contentStyle={{ height: SHEET_HEIGHT }}
    >
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
    </BottomSheet>
  );
}

function BlogSheet({ blog, visible, onClose, colors, isDark, editable = false, onSave = null, saving = false }) {
  const [mounted, setMounted] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible && blog) {
      setMounted(true);
      setEditTitle(blog.title || '');
      setEditContent(blog.content || '');
      translateY.value = withTiming(0, { duration: 250 });
      backdropOpacity.value = withTiming(1, { duration: 280 });
    } else if (mounted) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 });
      backdropOpacity.value = withTiming(0, { duration: 220 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const onGesture = (e) => {
    if (e.nativeEvent.translationY > 0) {
      translateY.value = e.nativeEvent.translationY;
    }
  };
  const onGestureEnd = () => {
    if (translateY.value > 150) {
      runOnJS(onClose)();
    } else {
      translateY.value = withTiming(0, { duration: 220 });
    }
  };

  if (!visible && !mounted) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }, backStyle]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <PanGestureHandler onGestureEvent={onGesture} onEnded={onGestureEnd}>
          <Animated.View style={[{ width: '100%', alignItems: 'center', marginBottom: 20 }, animatedStyle]}>
          <View style={{
            width: '95%', height: SCREEN_HEIGHT * 0.38,
            backgroundColor: colors.cardBackground,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 15,
            overflow: 'hidden',
          }}>
            <View style={{ alignSelf: 'center', paddingVertical: 8 }}>
              <View style={{ width: 40, height: 5, borderRadius: 10, backgroundColor: colors.border }} />
            </View>
            {!editable && (
              <View style={{ alignItems: 'center', paddingBottom: 10 }}>
                <Text style={{ color: colors.textMain, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
                  {blog?.title || 'Blog Yazısı'}
                </Text>
                <Text style={{ color: colors.textSub, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                  {formatTimeAgo(blog?.createdAt)}
                </Text>
              </View>
            )}
            {editable ? (
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '700' }}>BAŞLIK</Text>
                  <Text style={{ color: '#E63946', fontSize: 14, fontWeight: 'bold', marginLeft: 3 }}>*</Text>
                </View>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Başlık ekle..."
                  placeholderTextColor={colors.textSub}
                  maxLength={100}
                  style={{
                    backgroundColor: colors.background,
                    color: colors.textMain,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    fontWeight: '600',
                    marginBottom: 16,
                  }}
                />
                <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>İÇERİK</Text>
                <TextInput
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Konu ekle..."
                  placeholderTextColor={colors.textSub}
                  multiline
                  maxLength={5000}
                  style={{
                    backgroundColor: colors.background,
                    color: colors.textMain,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    minHeight: 110,
                    textAlignVertical: 'top',
                  }}
                />
              </ScrollView>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
              >
                {!!(blog?.mediaUri && typeof blog.mediaUri === 'string' && blog.mediaUri.length > 5) && (
                  <View style={{ width: '100%', aspectRatio: 1.6, borderRadius: 14, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.border }}>
                    {blog.mediaType === 'image' ? (
                      <Image source={{ uri: blog.mediaUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <VideoPlayer videoUri={blog.mediaUri} style={{ width: '100%', height: '100%' }} />
                    )}
                  </View>
                )}
                <Text style={{ color: colors.textMain, fontSize: 16, lineHeight: 26 }}>
                  {blog?.content || 'İçerik bulunamadı.'}
                </Text>
              </ScrollView>
            )}
          </View>
          {editable && (
            <>
              <TouchableOpacity
                onPress={() => onSave && onSave(editTitle, editContent)}
                activeOpacity={0.7}
                disabled={saving}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 15,
                  width: '95%',
                  alignSelf: 'center',
                  marginTop: 10,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}

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
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [blogSheetVisible, setBlogSheetVisible] = useState(false);
  const [blogEditMode, setBlogEditMode] = useState(false);
  const [savingBlog, setSavingBlog] = useState(false);
  const [overscrollBlur, setOverscrollBlur] = useState(0);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [optionsItem, setOptionsItem] = useState(null);
  const [menuAnchorY, setMenuAnchorY] = useState(0);
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const scrollY = useSharedValue(0);

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const isDark = themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  const styles = getStyles(colors, isDark);
  const postCardStyles = getPostCardStyles(colors);

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

        const followersSnap = await getDocs(collection(db, 'Users', profileUserId, 'followers'));
        setFollowersCount(followersSnap.size);
        const followingSnap = await getDocs(collection(db, 'Users', profileUserId, 'following'));
        setFollowingCount(followingSnap.size);
      } else {
        setUserData(null);
        Toast.show({
          type: 'error',
          text1: 'Kullanıcı bulunamadı',
          position: 'bottom',
        });
      }
    } catch (e) {
      console.error('User fetch error:', e);
      setUserData(null);
      Toast.show({
        type: 'error',
        text1: 'Kullanıcı bulunamadı',
        position: 'bottom',
      });
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
            if (visibility === 'only_me') return false;
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

          if (visibility === 'only_me') return false;
          if (visibility === 'friends') return isFollowingProfile;
          return true;
        });

        data = await Promise.all(filteredDocs.map(async d => {
          const postData = d.data();
          const uData = userData || {};
          return {
            id: d.id,
            ...postData,
            profileImageUrl: uData.profileImageUrl || null,
            userName: uData.fullName || 'İsimsiz',
            details: [uData.company, uData.job].filter(Boolean).join(' | '),
            liked: postData.likedBy?.includes(currentUserId) || false,
            repeated: postData.repeatedBy?.includes(currentUserId) || false,
            saved: postData.savedBy?.includes(currentUserId) || false,
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
      Toast.show({ type: 'info', text1: 'Takip etmek için giriş yapmalısınız.' });
      return;
    }
    if (currentUserId === profileUserId) {
      Toast.show({ type: 'info', text1: 'Kendi profilinizi takip edemezsiniz.' });
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
        Toast.show({ type: 'success', text1: `${userData.fullName} adlı kişiyi takip etmeyi bıraktınız.` });
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
        Toast.show({ type: 'success', text1: `${userData.fullName} adlı kişiyi takip etmeye başladınız.` });
      }
      fetchUser();
    } catch (e) {
      console.error('Takip işlemi hatası:', e);
      Toast.show({ type: 'error', text1: 'Takip işlemi sırasında bir sorun oluştu.' });
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
      Toast.show({ type: 'error', text1: 'Hata: Bağlantı isteği göndermek için giriş yapmalısınız veya profiliniz eksik.' });
      return;
    }
    if (currentUserId === profileUserId) {
      Toast.show({ type: 'info', text1: 'Kendi profilinize bağlantı isteği gönderemezsiniz.' });
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

      Toast.show({ type: 'success', text1: 'Bağlantı isteğiniz başarıyla gönderildi!' });
      setIsConnectionPending(true);
    } catch (error) {
      console.error('Bağlantı isteği gönderilirken hata oluştu:', error.message);
      Toast.show({ type: 'error', text1: 'Bağlantı isteği oluşturulurken bir hata oluştu: ' + error.message });
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const withdrawConnectionRequest = async () => {
    if (!currentUserId || !profileUserId) {
      Toast.show({ type: 'error', text1: 'Hata: Bağlantı isteğini geri çekmek için giriş yapmalısınız.' });
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
        Toast.show({ type: 'success', text1: 'Bağlantı isteği başarıyla geri çekildi.' });
        setIsConnectionPending(false); 
      } else {
        Toast.show({ type: 'info', text1: 'İptal edilecek bekleyen bir bağlantı isteği bulunamadı.' });
      }
    } catch (error) {
      console.error('Bağlantı isteği geri çekilirken hata oluştu:', error.message);
      Toast.show({ type: 'error', text1: 'Bağlantı isteği geri çekilirken bir hata oluştu: ' + error.message });
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

  const openBlogSheet = (blog, editable = false) => {
    setSelectedBlog(blog);
    setBlogEditMode(editable);
    setBlogSheetVisible(true);
  };

  const closeBlogSheet = () => {
    setBlogSheetVisible(false);
    setTimeout(() => setSelectedBlog(null), 350);
  };

  const handleEditBlog = () => {
    const item = optionsItem;
    setOptionsItem(null);
    if (!item || item._tab !== 'Blog') return;
    openBlogSheet(item, true);
  };

  const handleSaveBlog = async (newTitle, newContent) => {
    const blog = selectedBlog;
    if (!blog || !blog.id) return;
    if (!newTitle?.trim() || !newContent?.trim()) {
      Alert.alert('Uyarı', 'Başlık ve içerik boş olamaz.');
      return;
    }
    setSavingBlog(true);
    try {
      await updateDoc(doc(db, 'Users', profileUserId || currentUserId, 'blog', blog.id), {
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      setSavingBlog(false);
      closeBlogSheet();
      Toast.show({ type: 'success', text1: 'Başarılı', text2: 'Blog güncellendi.' });
      fetchTabData();
    } catch (e) {
      setSavingBlog(false);
      console.error('Blog güncelleme hatası:', e);
      Alert.alert('Hata', 'Blog güncellenirken bir hata oluştu.');
    }
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
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Image source={require('../../assets/images/back.png')} style={styles.iconBack} />
            </Pressable>
          </View>

          <View style={styles.skeletonBanner} />

          <View style={styles.profileSection}>
            <View style={styles.skeletonAvatarWrapper}>
              <View style={styles.skeletonAvatar} />
            </View>
            <View style={styles.nameContainer}>
              <View style={[styles.skeletonLine, { width: 120, height: 18, marginBottom: 8 }]} />
              <View style={[styles.skeletonLine, { width: 90, height: 13, marginBottom: 6 }]} />
              <View style={[styles.skeletonLine, { width: 70, height: 13 }]} />
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statsLeft}>
              <View style={styles.statItem}>
                <View style={[styles.skeletonLine, { width: 40, height: 16 }]} />
                <View style={[styles.skeletonLine, { width: 30, height: 11, marginTop: 4 }]} />
              </View>
              <View style={styles.statItem}>
                <View style={[styles.skeletonLine, { width: 40, height: 16 }]} />
                <View style={[styles.skeletonLine, { width: 30, height: 11, marginTop: 4 }]} />
              </View>
            </View>
            <View style={styles.companyInfo}>
              <View style={[styles.skeletonLine, { flex: 1, height: 13 }]} />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={[styles.paddingArea, { paddingTop: 6, paddingBottom: 6 }]}>
            <View style={[styles.skeletonLine, { width: 80, height: 14, marginBottom: 10 }]} />
            <View style={[styles.skeletonLine, { width: '100%', height: 13, marginBottom: 6 }]} />
            <View style={[styles.skeletonLine, { width: '85%', height: 13 }]} />
          </View>

          <View style={styles.buttonContainer}>
            <View style={[styles.skeletonButton, { flex: 1, height: 46 }]} />
            <View style={[styles.skeletonButton, { flex: 1, height: 46 }]} />
            <View style={[styles.skeletonButton, { flex: 1, height: 46 }]} />
          </View>

          <View style={styles.tabBar}>
            {['Blog', 'Projeler', 'Postlar'].map((tab, i) => (
              <View key={i} style={styles.tabItem}>
                <View style={[styles.skeletonLine, { width: 50, height: 15 }]} />
              </View>
            ))}
          </View>
        </ScrollView>
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
            <Text style={styles.jobText} numberOfLines={1}>
              {userData.degree || userData.branch
                ? (userData.branch ? `Öğrenci • ${userData.branch}` : 'Öğrenci')
                : (userData.profession || 'Meslek yok')}
            </Text>
            {(!!userData.city || !!userData.country) && (
              <View style={[styles.locationRow, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textSub} style={{ marginRight: 3 }} />
                  <Text style={styles.infoSubText} numberOfLines={1}>
                    {[userData.city, userData.country].filter(Boolean).join(', ')}
                  </Text>
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

        <TouchableOpacity
          onPress={() => setShowMoreInfo(!showMoreInfo)}
          style={[styles.paddingArea, { paddingTop: 0, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }]}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
            {showMoreInfo ? 'Daha Az Bilgi' : 'Daha Fazla Bilgi'}
          </Text>
          <Ionicons
            name={showMoreInfo ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        {showMoreInfo && (
          <View style={[styles.paddingArea, { paddingTop: 12, paddingBottom: 6 }]}>
            {!!userData.skills && userData.skills.length > 0 && userData.showSkills !== false && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.sectionLabel}>Beceriler</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {userData.skills.map((skill, index) => (
                    <View key={index} style={styles.moreInfoCard}>
                      <Text style={styles.moreInfoText} numberOfLines={1}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!userData.languages && userData.languages.length > 0 && userData.showLanguages !== false && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.sectionLabel}>Diller</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {userData.languages.map((lang, index) => (
                    <View key={index} style={styles.moreInfoCard}>
                      <Text style={styles.moreInfoText} numberOfLines={1}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!userData.interests && userData.interests.length > 0 && userData.showInterests !== false && (
              <View style={{ marginBottom: 4 }}>
                <Text style={styles.sectionLabel}>İlgi Alanları</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {userData.interests.map((interest, index) => (
                    <View key={index} style={styles.moreInfoCard}>
                      <Text style={styles.moreInfoText} numberOfLines={1}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(!userData.skills || userData.skills.length === 0) &&
             (!userData.languages || userData.languages.length === 0) &&
             (!userData.interests || userData.interests.length === 0) && (
              <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center' }}>
                Henüz eklenmemiş.
              </Text>
            )}
          </View>
        )}

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
                <View key={item.id} style={styles.postCard}>
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
                      {item.details?.length > 0 && <Text style={styles.postCardDetails}>{truncateString(item.details, 50)}</Text>}
                      <Text style={styles.postCardTime}>{moment(item.createdAt?.seconds * 1000).fromNow()}</Text>
                    </View>
                    <Pressable style={styles.optionsContainer} onPress={(event) => handleOptionsPress(item, event.nativeEvent.pageY)}>
                      <Text style={styles.optionsText}>···</Text>
                    </Pressable>
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

                  <PostCardActions
                    item={item}
                    colors={colors}
                    s={postCardStyles}
                    hasMedia={hasMedia}
                    onPostAction={handlePostAction}
                    onCommentPress={(id) => { setActivePostId(id); setCommentModalVisible(true); }}
                  />
                </View>
              );
            }

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
                    <TouchableOpacity onPress={() => openBlogSheet(item)} activeOpacity={0.7}>
                      <Text style={styles.moreBtn}>Devamını Oku →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }) : (
            <Text style={styles.emptyText}>Henüz bir içerik bulunmuyor.</Text>
          )}
        </View>
      </Animated.ScrollView>

      <ProjectSheet
        project={selectedProject}
        visible={sheetVisible}
        onClose={closeProjectSheet}
        colors={colors}
        isDark={isDark}
      />
      <BlogSheet
        blog={selectedBlog}
        visible={blogSheetVisible}
        onClose={closeBlogSheet}
        colors={colors}
        isDark={isDark}
        editable={blogEditMode}
        onSave={handleSaveBlog}
        saving={savingBlog}
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
        onEdit={isOwnProfile && optionsItem?._tab === 'Blog' ? handleEditBlog : null}
        onClose={() => setOptionsItem(null)}
        anchorY={menuAnchorY}
      />
    </View>
  );
}

const sheetStyles = StyleSheet.create({
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
  moreInfoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreInfoText: { color: colors.textMain, fontSize: 13, fontWeight: '600', textAlign: 'center' },
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
  postCardDetails: { color: colors.textSub, fontSize: 12, marginTop: 2 },
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
  optionsContainer: { padding: 5, paddingRight: 0 },
  optionsText: { color: colors.textSub, fontSize: 20, fontWeight: 'bold', marginTop: -15 },

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
  skeletonBanner: {
    width: '100%',
    height: 190,
    backgroundColor: colors.border,
  },
  skeletonAvatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: colors.background,
  },
  skeletonAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
  },
  skeletonLine: {
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  skeletonButton: {
    borderRadius: 12,
    backgroundColor: colors.border,
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

const getPostCardStyles = (colors) => StyleSheet.create({
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
  contentSection: { paddingHorizontal: 15, paddingBottom: 12 },
  cardDescInline: { color: colors.textMain, fontSize: 14, lineHeight: 21 },
  moreText: { color: colors.textSub, fontSize: 14, fontWeight: '600' },
  mediaWrapper: { width: '100%', aspectRatio: 1.2, backgroundColor: colors.background },
  mediaContent: { width: '100%', height: '100%' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 15 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cardActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionIconContainer: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { width: 20, height: 20, resizeMode: 'contain' },
  actionLabel: { color: colors.textSub, fontSize: 13, marginLeft: 6, fontWeight: '600' },
});