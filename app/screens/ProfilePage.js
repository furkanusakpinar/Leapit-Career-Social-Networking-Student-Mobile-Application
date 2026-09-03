import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, deleteDoc, doc, getDoc, getDocs, query, where, arrayUnion, arrayRemove, updateDoc, setDoc } from 'firebase/firestore';
import moment from 'moment';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  Dimensions,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { db } from '../../firebaseConfig';
import { getCompanyLogoUri } from '../utils/getCompanyLogoUri';
import { getSchoolLogoUri } from '../utils/getSchoolLogoUri';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { lightTheme, darkTheme } from '../theme/colors';
import { BlurView } from 'expo-blur';
import VideoPlayer from '../components/VideoPlayer';
import CommentModal from '../components/CommentModal';
import PostOptionsMenu from '../components/PostOptionsMenu';
import BottomSheet from '../components/BottomSheet';
import { deleteFromCloudinary, uploadToCloudinary } from '../utils/cloudinary';
import { fetchReadmeFromGithub } from '../utils/github';
import * as ImagePicker from 'expo-image-picker';

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
            <Text style={{ fontSize: 16, marginRight: 8, color: colors.textMain }}>GitHub Link:</Text>
            <Text style={[sheetStyles.githubText, { color: colors.primary }]} numberOfLines={1}>
              {project.githubUrl}
            </Text>
          </TouchableOpacity>
        )}

        {loading && !readmeContent ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSub, marginTop: 10, fontSize: 13 }}>{"GitHub'dan README yükleniyor..."}</Text>
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

function ProfileEditSheet({ visible, onClose, colors, isDark, userData, userId, onSaveSuccess }) {
  const [bio, setBio] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [backProfileImageUri, setBackProfileImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && userData) {
      setBio(userData.bio || '');
      setUserLocation(userData.userLocation || '');
      setCvUrl(userData.cvUrl || '');
      setGithubLink(userData.githubLink || '');
      setInstagramLink(userData.instagramLink || '');
      setProfileImageUri(userData.profileImageUrl || null);
      setBackProfileImageUri(userData.backProfileImageUrl || null);
    }
  }, [visible, userData]);

  const handleChoosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Galeri İzni', 'Galeriye erişim izni verilmedi.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImageUri(result.assets[0].uri);
    }
  };

  const handleChooseBackPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Galeri İzni', 'Galeriye erişim izni verilmedi.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 6],
      quality: 0.7,
    });

    if (!result.canceled) {
      setBackProfileImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!bio.trim()) {
      Alert.alert('Hata', 'Lütfen "Hakkımda" bölümünü doldurun.');
      return;
    }
    if (!userLocation.trim()) {
      Alert.alert('Hata', 'Lütfen konum bilginizi doldurun.');
      return;
    }

    setIsLoading(true);
    let imageUrlForFirebase = profileImageUri;
    let backImageUrlForFirebase = backProfileImageUri;

    try {
      const hasNewProfileImage = profileImageUri && !profileImageUri.startsWith('http');
      const hasNewBackProfileImage = backProfileImageUri && !backProfileImageUri.startsWith('http');

      if (hasNewProfileImage) {
        imageUrlForFirebase = await uploadToCloudinary(profileImageUri, 'image');
      }

      if (hasNewBackProfileImage) {
        backImageUrlForFirebase = await uploadToCloudinary(backProfileImageUri, 'image');
      }

      const updateData = {
        bio: bio.trim(),
        userLocation: userLocation.trim(),
        cvUrl: cvUrl.trim(),
        githubLink: githubLink.trim(),
        instagramLink: instagramLink.trim(),
        profileImageUrl: imageUrlForFirebase,
        backProfileImageUrl: backImageUrlForFirebase,
      };

      await updateDoc(doc(db, 'Users', userId), updateData);
      Toast.show({ type: 'success', text1: 'Başarılı', text2: 'Profiliniz başarıyla güncellendi!' });
      onSaveSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Profil kaydedilirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSaveProfile = bio.trim() !== '' && userLocation.trim() !== '' && !isLoading;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Profili Düzenle" contentStyle={{ height: SHEET_HEIGHT }}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 15, paddingBottom: 40 }}>
            <View style={{ width: '100%', marginBottom: 48, marginTop: 5 }}>
              <Pressable
                onPress={handleChooseBackPhoto}
                style={{ width: '100%', height: 110, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.border }}
              >
                {backProfileImageUri ? (
                  <Image source={{ uri: backProfileImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="image-outline" size={26} color={colors.textSub} />
                  </View>
                )}
                <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 15 }}>
                  <Ionicons name="camera" size={14} color="white" />
                </View>
              </Pressable>

              <View style={{ position: 'absolute', bottom: -44, left: 16 }}>
                <Pressable onPress={handleChoosePhoto} style={{ position: 'relative' }}>
                  {profileImageUri ? (
                    <Image
                      source={{ uri: profileImageUri }}
                      style={{ width: 80, height: 80, borderRadius: 13, borderWidth: 3, borderColor: colors.cardBackground }}
                    />
                  ) : (
                    <View style={{ width: 80, height: 80, borderRadius: 13, borderWidth: 3, borderColor: colors.cardBackground, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="account" size={48} color={colors.textSub} />
                    </View>
                  )}
                  <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: colors.primary, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.cardBackground }}>
                    <Ionicons name="camera" size={11} color="white" />
                  </View>
                </Pressable>
              </View>
            </View>

            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 10 }}>Hakkımda</Text>
            <TextInput
              placeholder="Kendinizden bahsedin..."
              placeholderTextColor={colors.textSub}
              style={{
                backgroundColor: isDark ? '#13151C' : '#F0F0F0',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                color: colors.textMain,
                fontSize: 16,
                height: 80,
                textAlignVertical: 'top',
              }}
              multiline
              value={bio}
              onChangeText={setBio}
              maxLength={500}
            />
            <Text style={{ color: colors.textSub, fontSize: 10, textAlign: 'right', marginTop: 2, marginBottom: 10 }}>{bio.length}/500</Text>

            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Konum *</Text>
            <TextInput
              placeholder="Şehir, Ülke"
              placeholderTextColor={colors.textSub}
              style={{
                backgroundColor: isDark ? '#13151C' : '#F0F0F0',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 15,
                color: colors.textMain,
                fontSize: 16,
                height: 50,
              }}
              value={userLocation}
              onChangeText={setUserLocation}
              maxLength={100}
            />
            <Text style={{ color: colors.textSub, fontSize: 10, textAlign: 'right', marginTop: 2, marginBottom: 10 }}>{userLocation.length}/100</Text>

            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>CV Bağlantısı (URL)</Text>
            <TextInput
              placeholder="CV / Portfolyo linkinizi girin..."
              placeholderTextColor={colors.textSub}
              style={{
                backgroundColor: isDark ? '#13151C' : '#F0F0F0',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 15,
                color: colors.textMain,
                fontSize: 16,
                height: 50,
              }}
              value={cvUrl}
              onChangeText={setCvUrl}
              maxLength={200}
            />
            <Text style={{ color: colors.textSub, fontSize: 10, textAlign: 'right', marginTop: 2, marginBottom: 15 }}>{cvUrl.length}/200</Text>

            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>GitHub Linki (İsteğe Bağlı)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#13151C' : '#F0F0F0', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 15, marginBottom: 12, height: 50 }}>
              <Ionicons name="logo-github" size={18} color={colors.textSub} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="https://github.com/kullanici"
                placeholderTextColor={colors.textSub}
                style={{ flex: 1, color: colors.textMain, fontSize: 16 }}
                value={githubLink}
                onChangeText={setGithubLink}
                autoCapitalize="none"
                keyboardType="url"
                maxLength={200}
              />
            </View>

            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Instagram Linki (İsteğe Bağlı)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#13151C' : '#F0F0F0', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, height: 50 }}>
              <Ionicons name="logo-instagram" size={18} color={colors.textSub} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="https://instagram.com/kullanici"
                placeholderTextColor={colors.textSub}
                style={{ flex: 1, color: colors.textMain, fontSize: 16 }}
                value={instagramLink}
                onChangeText={setInstagramLink}
                autoCapitalize="none"
                keyboardType="url"
                maxLength={200}
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 14,
                borderRadius: 10,
                alignItems: 'center',
                opacity: canSaveProfile ? 1 : 0.5,
              }}
              onPress={handleSave}
              disabled={!canSaveProfile}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Kaydet</Text>
              )}
            </TouchableOpacity>
        </View>
    </BottomSheet>
  );
}

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

function SavedPostCard({ item, isExpanded, hasMedia, displayContent, colors, onToggleExpand, onPostAction, onCommentPress, onOptionsPress, navigation }) {
  const s = getPostCardStyles(colors);
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Pressable onPress={() => navigation?.navigate('OtherProfilePage', { userId: item.userId })}>
          <Image
            source={
              item.profileImageUrl && typeof item.profileImageUrl === 'string' && item.profileImageUrl.length > 0
                ? { uri: item.profileImageUrl }
                : require('../../assets/images/ProfileSquare.png')
            }
            style={s.cardProfil}
          />
        </Pressable>
        <View style={s.headerTextContainer}>
          <Text style={s.cardName}>{item.userName}</Text>
          {item.details?.length > 0 && <Text style={s.followerCountText}>{truncateString(item.details, 50)}</Text>}
          <Text style={s.cardTime}>{moment(item.createdAt?.seconds * 1000).fromNow()} • 🌎</Text>
        </View>
        <Pressable style={s.optionsContainer} onPress={(e) => onOptionsPress?.(item, e.nativeEvent.pageY)}>
          <Text style={s.optionsText}>···</Text>
        </Pressable>
      </View>

      <View style={s.contentSection}>
        <Text style={s.cardDescInline}>
          {displayContent}
          {item.content?.length > 100 && (
            <Text onPress={() => onToggleExpand(item.id)} style={s.moreText}>
              {isExpanded ? ' Daha Az' : ' ...daha fazla'}
            </Text>
          )}
        </Text>
      </View>

      {hasMedia && (
        <View style={s.mediaWrapper}>
          {item.mediaType === 'image' ? (
            <Image source={{ uri: item.mediaUri }} style={s.mediaContent} resizeMode="cover" />
          ) : (
            <VideoPlayer videoUri={item.mediaUri} style={s.mediaContent} />
          )}
        </View>
      )}

      <PostCardActions
        item={item}
        colors={colors}
        s={s}
        hasMedia={hasMedia}
        onPostAction={onPostAction}
        onCommentPress={onCommentPress}
      />
    </View>
  );
}

const getPostCardStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 0,
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
  contentSection: { paddingHorizontal: 15, paddingBottom: 12  },
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
  const [savedCategory, setSavedCategory] = useState(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
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
      let tab = item._tab;
      if (tab === 'Kaydedilenler') {
        if (savedCategory === 'Postlar') tab = 'Postlar';
        else if (savedCategory === 'Projeler') tab = 'Projeler';
        else if (savedCategory === 'İş İlanları') tab = 'İş İlanları';
        else if (savedCategory === 'Blog') tab = 'Blog';
      }
      
      const ownerId = item.userId || userId;

      if (tab === 'Blog') {
        await deleteDoc(doc(db, 'Users', ownerId, 'blog', item.id));
      } else if (tab === 'Projeler') {
        await deleteDoc(doc(db, 'Users', ownerId, 'projects', item.id));
      } else if (tab === 'Postlar') {
        if (item.mediaUri) {
          await deleteFromCloudinary(item.mediaUri, item.mediaType || 'image');
        }
        await deleteDoc(doc(db, 'Posts', item.id));
      } else if (tab === 'İş İlanları') {
        await deleteDoc(doc(db, 'JobsPosts', item.id));
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
        data = await Promise.all(snapshot.docs.map(async d => {
          const projectData = d.data();
          let isSaved = false;
          if (loggedInUserId) {
            const saveRef = doc(db, 'Users', loggedInUserId, 'saves', 'Projeler', 'items', d.id);
            const saveSnap = await getDoc(saveRef);
            isSaved = saveSnap.exists();
          }
          return {
            id: d.id,
            ...projectData,
            saved: isSaved
          };
        }));
      } else if (selectedTab === 'Kaydedilenler') {
        if (!savedCategory) {
          setTabData([]);
          return;
        }

        const path = `Users/${userId}/saves/${savedCategory}/items`;
        console.log("Sorgulanan Firestore Yolu:", path);

        const savesSnap = await getDocs(collection(db, path));
        
        if (savedCategory === 'Projeler') {
          const projectDocs = await Promise.all(savesSnap.docs.map(async d => {
            const saveData = d.data();
            const ownerId = saveData.ownerId || userId;
            try {
              const projectSnap = await getDoc(doc(db, 'Users', ownerId, 'projects', d.id));
              if (projectSnap.exists()) {
                const projectData = projectSnap.data();
                let authorName = 'İsimsiz';
                let authorAvatar = null;
                let authorDetails = '';
                
                try {
                  const uSnap = await getDoc(doc(db, 'Users', ownerId));
                  if (uSnap.exists()) {
                    const uData = uSnap.data();
                    authorName = uData.fullName || 'İsimsiz';
                    authorAvatar = uData.profileImageUrl || null;
                    authorDetails = [uData.company, uData.job].filter(Boolean).join(' | ');
                  }
                } catch (e) {
                  console.error("Author fetch error for saved project:", e);
                }

                return {
                  id: projectSnap.id,
                  ...projectData,
                  userId: ownerId,
                  profileImageUrl: authorAvatar,
                  userName: authorName,
                  details: authorDetails,
                  content: projectData.readme || projectData.content || '',
                  saved: true
                };
              }
            } catch (err) {
              console.error("Error fetching saved project:", err);
            }
            return null;
          }));
          data = projectDocs.filter(Boolean);
          console.log("Çekilen Proje sayısı:", data.length);
        } else {
          let collectionPath = "";
          if (savedCategory === 'Postlar') collectionPath = "Posts";
          else if (savedCategory === 'İş İlanları') collectionPath = "JobsPosts";

          if (collectionPath) {
             let ids = savesSnap.docs.map(d => d.id);
             console.log("Bulunan ID'ler:", ids);

             if (ids.length > 0) {
                const postsSnap = await getDocs(query(collection(db, collectionPath), where("__name__", "in", ids.slice(0, 30))));
                data = await Promise.all(postsSnap.docs.map(async d => {
                  const postData = d.data();
                  let authorName = 'İsimsiz';
                  let authorAvatar = null;
                  let authorDetails = '';
                  let companyLogo = null;
                  
                  if (savedCategory === 'İş İlanları') {
                    try {
                      companyLogo = await getCompanyLogoUri(postData.company || '');
                    } catch (e) {
                      console.error("Company logo error:", e);
                    }
                  }
                  
                  if (postData.userId) {
                    try {
                      const uSnap = await getDoc(doc(db, 'Users', postData.userId));
                      if (uSnap.exists()) {
                        const uData = uSnap.data();
                        authorName = uData.fullName || 'İsimsiz';
                        authorAvatar = uData.profileImageUrl || null;
                        authorDetails = [uData.company, uData.job].filter(Boolean).join(' | ');
                      }
                    } catch (e) {
                      console.error("Author fetch error:", e);
                    }
                  }
                  return {
                    id: d.id,
                    ...postData,
                    profileImageUrl: authorAvatar,
                    userName: authorName,
                    details: authorDetails,
                    companyLogo,
                    liked: postData.likedBy?.includes(loggedInUserId) || false,
                    repeated: postData.repeatedBy?.includes(loggedInUserId) || false,
                    saved: true,
                    likesCount: postData.likedBy?.length || 0,
                    repeatsCount: postData.repeatedBy?.length || 0,
                    commentsCount: postData.comments?.length || 0,
                  };
                }));
                console.log("Çekilen veri sayısı:", data.length);
             }
          }
        }
      } else if (selectedTab === 'Postlar') {
        const snapshot = await getDocs(query(collection(db, 'Posts'), where('userId', '==', userId)));
        
        let isFollowing = false;
        if (loggedInUserId && loggedInUserId !== userId) {
          const followSnap = await getDoc(doc(db, 'Users', loggedInUserId, 'following', userId));
          isFollowing = followSnap.exists();
        }

        const filteredDocs = snapshot.docs.filter(d => {
          const postData = d.data();
          const isAuthor = postData.userId === loggedInUserId;
          const visibility = postData.visibility || 'everyone';

          if (visibility === 'only_me') {
            return isAuthor;
          } else if (visibility === 'friends') {
            return isAuthor || isFollowing;
          }
          return true;
        });

        data = await Promise.all(filteredDocs.map(async d => {
          const postData = d.data();
          return {
            id: d.id,
            ...postData,
            profileImageUrl: userData?.profileImageUrl || null,
            userName: userData?.fullName || 'İsimsiz',
            liked: postData.likedBy?.includes(loggedInUserId) || false,
            repeated: postData.repeatedBy?.includes(loggedInUserId) || false,
            saved: true,
            likesCount: postData.likedBy?.length || 0,
            repeatsCount: postData.repeatedBy?.length || 0,
            commentsCount: postData.comments?.length || 0,
          };
        }));
      }
      setTabData(data);
    } catch (e) {
      console.error("Tab data error:", e);
      setTabData([]);
    }
  };

  useEffect(() => { fetchUser(); }, [userId]);
  useEffect(() => { fetchTabData(); }, [selectedTab, userId, savedCategory]);
  useEffect(() => {
    if (userData?.company) getCompanyLogoUri(userData.company).then(setCompanyLogoUri);
    if (userData?.school) getSchoolLogoUri(userData.school).then(setSchoolLogoUri);
  }, [userData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchUser(), fetchTabData()]).then(() => setRefreshing(false));
  }, [userId, selectedTab]);

  const handlePostAction = async (postId, field, isActive, category = 'Postlar', itemOwnerId = null) => {
    if (!loggedInUserId) return;

    if (field === 'savedBy') {
      try {
        const saveRef = doc(db, 'Users', loggedInUserId, 'saves', category, 'items', postId);
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
      }
    }

    let itemRef = null;
    const ownerId = itemOwnerId || userId;

    if (category === 'İş İlanları') {
      itemRef = doc(db, 'JobsPosts', postId);
    } else if (category === 'Projeler') {
      if (ownerId) {
        itemRef = doc(db, 'Users', ownerId, 'projects', postId);
      }
    } else {
      itemRef = doc(db, 'Posts', postId);
    }

    if (itemRef) {
      try {
        await updateDoc(itemRef, {
          [field]: isActive ? arrayRemove(loggedInUserId) : arrayUnion(loggedInUserId)
        });
        fetchTabData();
      } catch (error) { console.error(`${field} hatası:`, error); }
    }
  };

  const handleToggleSave = async (item) => {
    setOptionsItem(null);
    if (!item) return;

    let category = 'Postlar';
    if (selectedTab === 'Kaydedilenler') {
      category = savedCategory || 'Postlar';
    } else if (selectedTab === 'Projeler') {
      category = 'Projeler';
    } else if (selectedTab === 'Postlar') {
      category = 'Postlar';
    }

    await handlePostAction(item.id, 'savedBy', item.saved, category, item.userId || userId);
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
          <Pressable onPress={() => setEditSheetVisible(true)} style={styles.headerBtn}>
            <Image source={require('../../assets/images/userEdit.png')} style={styles.iconEdit} />
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
                    <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '600' }}>İletişim
                    </Text>
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

        <View style={styles.tabBar}>
          {['Blog', 'Projeler', 'Postlar', 'Kaydedilenler'].map(tab => (
            <Pressable key={tab} onPress={() => setSelectedTab(tab)} style={[styles.tabItem, selectedTab === tab && styles.activeTab]}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        <View style={(selectedTab === 'Postlar' || selectedTab === 'Kaydedilenler') ? { paddingVertical: 20, paddingHorizontal: 10 } : styles.paddingArea}>
          {selectedTab === 'Kaydedilenler' ? (
             savedCategory ? (
                <View>
                   <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                       <TouchableOpacity onPress={() => setSavedCategory(null)} style={{ padding: 4 }}>
                          <Image source={require('../../assets/images/back.png')} style={{ width: 24, height: 24, resizeMode: 'contain', tintColor: colors.textMain }} />
                       </TouchableOpacity>
                      <Text style={{fontSize: 16, color: colors.textMain, fontWeight: 'bold', marginLeft: 5}}>{savedCategory}</Text>
                   </View>
                   {tabData.length > 0 ? (
                      <View>
                         {tabData.map(item => {
                           if (savedCategory === 'İş İlanları') {
                             return (
                               <View key={item.id} style={styles.jobCard}>
                                 <View style={styles.jobCardHeader}>
                                   <Pressable
                                     onPress={() => navigation.navigate('JobsDetail', { jobsId: item.id })}
                                     style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                                   >
                                     <Image
                                       source={
                                         item.companyLogo && item.companyLogo.length > 0
                                           ? { uri: item.companyLogo }
                                           : require('../../assets/images/DefaultCompanyLogo.png')
                                       }
                                       style={styles.jobLogo}
                                     />
                                     <View style={{ flex: 1 }}>
                                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                         <Text style={styles.jobCardTitle} numberOfLines={1}>{item.jobTitle?.length > 30 ? item.jobTitle.slice(0, 30) + '...' : item.jobTitle}</Text>
                                       </View>
                                       <Text style={styles.jobCardSub} numberOfLines={1}>
                                         {item.company} • {item.jobLocation}
                                       </Text>
                                     </View>
                                   </Pressable>
                                 </View>
                                 {item.media && typeof item.media === 'string' && item.media.length > 0 ? (
                                   <Image source={{ uri: item.media }} style={styles.jobCardImage} />
                                 ) : null}
                                 {item.content && <Text style={styles.jobCardContent}>{item.content}</Text>}
                               </View>
                             );
                           }

                            if (savedCategory === 'Projeler') {
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
                                  {!!item.githubUrl && (
                                    <Text style={[styles.githubLink]} numberOfLines={1}>🔗 {item.githubUrl}</Text>
                                  )}
                                  <View style={styles.cardFooter}>
                                    <Text style={styles.dateText}>{formatTimeAgo(item.createdAt)}</Text>
                                    <TouchableOpacity onPress={() => openProjectSheet(item)} activeOpacity={0.7}>
                                      <Text style={styles.moreBtn}>Detayları Gör →</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            }

                           const isExpanded = expandedPosts[item.id];
                           const hasMedia = !!(item.mediaUri && item.mediaUri.length > 5);
                           const displayContent = (item.content?.length > 100 && !isExpanded)
                             ? item.content.substring(0, 100) + '...'
                             : item.content;
                           return (
                             <SavedPostCard
                               key={item.id}
                               item={item}
                               isExpanded={isExpanded}
                               hasMedia={hasMedia}
                               displayContent={displayContent}
                               colors={colors}
                               onToggleExpand={toggleExpand}
                               onPostAction={handlePostAction}
                               onCommentPress={(id) => { setActivePostId(id); setCommentModalVisible(true); }}
                               onOptionsPress={isOwnProfile ? handleOptionsPress : null}
                               navigation={navigation}
                             />
                           );
                         })}
                      </View>
                   ) : <Text style={styles.emptyText}>Bu kategoride kayıt yok.</Text>}
                </View>
             ) : (
                <View>
                   {['Postlar', 'İş İlanları', 'Projeler'].map(cat => (
                      <TouchableOpacity key={cat} onPress={() => setSavedCategory(cat)} style={[styles.card, {padding: 20}]}>
                         <Text style={{color: colors.textMain, fontSize: 16, fontWeight: 'bold'}}>{cat}</Text>
                      </TouchableOpacity>
                   ))}
                </View>
             )
          ) : tabData.length > 0 ? (
              tabData.map(item => {
                if (selectedTab === 'Postlar') {
                  const isExpanded = expandedPosts[item.id];
                  const hasMedia = !!(item.mediaUri && item.mediaUri.length > 5);
                  const displayContent = (item.content?.length > 100 && !isExpanded)
                    ? item.content.substring(0, 100) + '...'
                    : item.content;
                  return (
                    <SavedPostCard
                      key={item.id}
                      item={item}
                      isExpanded={isExpanded}
                      hasMedia={hasMedia}
                      displayContent={displayContent}
                      colors={colors}
                      onToggleExpand={toggleExpand}
                      onPostAction={handlePostAction}
                      onCommentPress={(id) => { setActivePostId(id); setCommentModalVisible(true); }}
                      onOptionsPress={isOwnProfile ? handleOptionsPress : null}
                      navigation={navigation}
                    />
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
                        <Text style={styles.moreBtn}>Devamını Oku →</Text>
                      )}
                    </View>
                  </View>
                );
              })
          ) : (
            selectedTab !== 'Kaydedilenler' && <Text style={styles.emptyText}>Henüz bir içerik bulunmuyor.</Text>
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
      <CommentModal
        visible={commentModalVisible}
        onClose={() => { setCommentModalVisible(false); setActivePostId(null); }}
        postId={activePostId}
        currentUserId={loggedInUserId}
      />
      <PostOptionsMenu
        visible={!!optionsItem}
        isOwnPost={optionsItem?.userId === loggedInUserId}
        isSaved={optionsItem?.saved}
        onDelete={handleDeleteItem}
        onReport={handleReportItem}
        onSave={() => handleToggleSave(optionsItem)}
        onClose={() => setOptionsItem(null)}
        anchorY={menuAnchorY}
      />
      <ProfileEditSheet
        visible={editSheetVisible}
        onClose={() => setEditSheetVisible(false)}
        colors={colors}
        isDark={isDark}
        userData={userData}
        userId={loggedInUserId}
        onSaveSuccess={fetchUser}
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
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  dateText: { color: colors.textSub, fontSize: 11 },
  moreBtn: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
  savedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  savedItem: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  savedImage: { width: '100%', height: '100%' },
  savedPlaceholder: { flex: 1, padding: 10, justifyContent: 'center' },
  savedText: { fontSize: 12, color: colors.textMain },
  emptyText: { color: colors.textSub, fontSize: 14, textAlign: 'center', marginTop: 20 },

  postCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 0,
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
  savedVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  jobCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobLogo: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.border,
  },
  jobCardTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  jobCardSub: {
    color: colors.textMain,
    fontSize: 13,
    opacity: 0.8,
    marginTop: 2,
  },
  jobCardContent: {
    color: colors.textMain,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  jobCardImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 10,
    resizeMode: 'cover',
  },
});