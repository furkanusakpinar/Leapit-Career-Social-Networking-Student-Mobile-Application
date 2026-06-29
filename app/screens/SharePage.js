import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, collection, addDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import VideoPlayer from '../components/VideoPlayer';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { lightTheme, darkTheme } from '../theme/colors';
import { uploadToCloudinary } from '../utils/cloudinary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getToastConfig = (colors) => ({
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#69B958', backgroundColor: colors.cardBackground, height: 60, borderRadius: 10, width: '90%' }}
      text1Style={{ fontSize: 15, fontWeight: 'bold', color: colors.textMain }}
      text2Style={{ fontSize: 13, color: colors.textSub }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#E63946', backgroundColor: colors.cardBackground, height: 60, borderRadius: 10, width: '90%' }}
      text1Style={{ fontSize: 15, fontWeight: 'bold', color: colors.textMain }}
      text2Style={{ fontSize: 13, color: colors.textSub }}
    />
  ),
});

export function SharePage() {
  const userId = useSelector((state) => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);
  const toastConfig = getToastConfig(colors);

  const [newPost, setNewPost] = useState('');
  const [userData, setUserData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const { prePostId } = route.params || {};
  const [currentMedia, setCurrentMedia] = useState({ uri: null, type: null });

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'Users', userId), (docSnap) => {
      setUserData(docSnap.exists() ? docSnap.data() : null);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!prePostId) return;
    const unsub = onSnapshot(doc(db, 'prePosts', prePostId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentMedia({ uri: data.mediaUri, type: data.mediaType });
      } else {
        if (navigation.canGoBack()) navigation.goBack();
      }
    });
    return () => unsub();
  }, [prePostId]);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      if (currentMedia.uri) {
        Animated.timing(translateY, {
          toValue: -e.endCoordinates.height * 0.3,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [currentMedia.uri]);

  const handleGonder = async () => {
    if (!newPost.trim() && !currentMedia?.uri) return;
    setUploading(true);

    try {
      let finalMediaUri = currentMedia.uri;
      if (finalMediaUri && !finalMediaUri.startsWith('http')) {
        // Upload to Cloudinary first
        finalMediaUri = await uploadToCloudinary(finalMediaUri, currentMedia.type);
      }

      await addDoc(collection(db, 'Posts'), {
        userId,
        userName: userData?.fullName || 'İsimsiz',
        content: newPost.trim(),
        mediaUri: finalMediaUri || '',
        mediaType: currentMedia.type || null,
        createdAt: serverTimestamp(),
      });

      if (prePostId) await deleteDoc(doc(db, 'prePosts', prePostId));

      Toast.show({ type: 'success', text1: 'Başarılı', text2: 'Gönderi paylaşıldı!' });
      
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.popToTop();
        }
      }, 500);

    } catch (error) {
      console.error("Post upload/share error:", error);
      Toast.show({ type: 'error', text1: 'Hata', text2: 'Paylaşılamadı.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.flex1, { transform: [{ translateY }] }]}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={15}>
                <Image source={require('../../assets/images/back.png')} style={[styles.iconBack, { tintColor: colors.iconTint }]} />
              </Pressable>
              <Text style={styles.headerTitle}>Yeni Gönderi</Text>
              <Pressable 
                onPress={handleGonder} 
                disabled={uploading}
                style={[styles.publishBtn, { opacity: uploading ? 0.6 : 1 }]}
              >
                {uploading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Image source={require('../../assets/images/Upload.png')} style={styles.iconUpload} />
                )}
              </Pressable>
            </View>

            <View style={styles.profileRow}>
              <Image
                source={userData?.profileImageUrl ? { uri: userData.profileImageUrl } : require('../../assets/images/ProfileSquare.png')}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{userData?.fullName || 'İsimsiz'}</Text>
                <View style={styles.badge}>
                  <Image source={require('../../assets/images/GlobalGray.png')} style={styles.badgeIcon} />
                  <Text style={styles.badgeText}>Herkes görebilir</Text>
                </View>
              </View>
            </View>

            {currentMedia.uri && (
              <View style={styles.mediaBox}>
                {currentMedia.type === 'image' ? (
                  <Image source={{ uri: currentMedia.uri }} style={styles.fullMedia} />
                ) : (
                  <VideoPlayer videoUri={currentMedia.uri} style={styles.fullMedia} />
                )}
              </View>
            )}

            <TextInput
              placeholder="Neler oluyor?"
              placeholderTextColor={colors.textSub}
              value={newPost}
              onChangeText={setNewPost}
              style={styles.textInput}
              multiline
            />

            <View style={styles.tools}>
              <Pressable onPress={() => setNewPost(p => p + ' @')} style={styles.toolBtn}>
                <Image source={require('../../assets/images/At.png')} style={[styles.toolIcon, { tintColor: colors.textSub }]} />
              </Pressable>
              <Pressable onPress={() => setNewPost(p => p + ' #')} style={styles.toolBtn}>
                <Image source={require('../../assets/images/Hash.png')} style={[styles.toolIcon, { tintColor: colors.textSub }]} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>

    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  content: { flex: 1, paddingHorizontal: '5%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  iconBack: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: { color: colors.textMain, fontSize: 18, fontWeight: 'bold' },
  publishBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconUpload: { width: 20, height: 20, tintColor: 'white' },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border },
  profileInfo: { marginLeft: 12 },
  userName: { color: colors.textMain, fontSize: 16, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  badgeIcon: { width: 12, height: 12, marginRight: 4, tintColor: colors.textSub },
  badgeText: { color: colors.textSub, fontSize: 12 },
  textInput: { flex: 1, color: colors.textMain, fontSize: 16, textAlignVertical: 'top', paddingTop: 10 },
  mediaBox: { width: '100%', height: SCREEN_WIDTH * 0.7, borderRadius: 15, overflow: 'hidden', marginVertical: 10, backgroundColor: '#000' },
  fullMedia: { width: '100%', height: '100%', resizeMode: 'cover' },
  tools: { flexDirection: 'row', paddingVertical: 15, borderTopWidth: 0.5, borderTopColor: colors.border },
  toolBtn: { marginRight: 20 },
  toolIcon: { width: 24, height: 24, resizeMode: 'contain' },
});

export default SharePage;