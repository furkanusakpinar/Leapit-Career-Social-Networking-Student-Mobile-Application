import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';
import VideoPlayer from '../components/VideoPlayer';
import { uploadToCloudinary } from '../utils/cloudinary';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { width } = Dimensions.get('window');


const getToastConfig = (colors) => ({
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#69B958', backgroundColor: colors.cardBackground, height: 70, borderRadius: 10 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.textMain
      }}
      text2Style={{
        fontSize: 13,
        color: colors.textSub
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#E63946', backgroundColor: colors.cardBackground, height: 70, borderRadius: 10, }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.textMain
      }}
      text2Style={{
        fontSize: 13,
        color: colors.textSub
      }}
    />
  ),
  info: ({ text1, text2, props }) => (
    <View style={{ height: 70, width: '90%', backgroundColor: colors.primary, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, }}>
      <Ionicons name="information-circle-outline" size={24} color="white" style={{ marginRight: 10 }} />
      <View>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: 'white' }}>{text1}</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{text2}</Text>
      </View>
    </View>
  ),
});


export function BlogPage() {
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);
  const toastConfig = getToastConfig(colors);

  const [newBlogTitle, setNewBlogTitle] = useState('');
  const [newBlogSubject, setNewBlogSubject] = useState('');
  const [userData, setUserData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  
  const { prePostId } = route.params || {};

  
  const [currentMedia, setCurrentMedia] = useState({ uri: null, type: null });
  const [postVisibility, setPostVisibility] = useState('global'); 

  
  useEffect(() => {
    if (!userId) {
      setUserData(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'Users', userId), (docSnap) => {
      setUserData(docSnap.exists() ? docSnap.data() : null);
    }, (error) => console.error('Firestore listen error (Users):', error));
    return () => unsub();
  }, [userId]);

  
  useEffect(() => {
    if (!prePostId) {
      
      setCurrentMedia({ uri: null, type: null });
      setPostVisibility('global');
      return;
    }

    const prePostRef = doc(db, 'prePosts', prePostId);
    const unsub = onSnapshot(prePostRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentMedia({ uri: data.mediaUri, type: data.mediaType });
        
        setPostVisibility(data.visibility || 'global');
      } else {
        
        setCurrentMedia({ uri: null, type: null });
        setPostVisibility('global');
        Toast.show({
          type: 'info',
          text1: 'Bilgi',
          text2: 'Geçici gönderi süresi dolmuş veya yayınlanmış.',
        });
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainSwipe' }],
          })
        );
      }
    }, (error) => console.error('Firestore listen error (prePosts):', error));

    return () => unsub();
  }, [prePostId, navigation]);


  const handleGonder = async () => {
    if (!newBlogTitle.trim() && !newBlogSubject.trim()) {
      Toast.show({
        type: 'info',
        text1: 'Uyarı',
        text2: 'Lütfen başlık ve konu ekleyin.',
      });
      return;
    }
    if (!newBlogTitle.trim()) {
      Toast.show({
        type: 'info',
        text1: 'Uyarı',
        text2: 'Lütfen başlık ekleyin.',
      });
      return;
    }
    if (!newBlogSubject.trim()) {
      Toast.show({
        type: 'info',
        text1: 'Uyarı',
        text2: 'Lütfen Konu ekleyin.',
      });
      return;
    }

    setUploading(true);

    let finalMediaUri = currentMedia?.uri || null;
    let finalMediaType = currentMedia?.type || null;

    try {
      
      let prePostData = {};
      if (prePostId) {
        const prePostSnap = await getDoc(doc(db, 'prePosts', prePostId));
        if (prePostSnap.exists()) {
          prePostData = prePostSnap.data();
          finalMediaUri = prePostData.mediaUri || finalMediaUri;
          finalMediaType = prePostData.mediaType || finalMediaType;
          
          setPostVisibility(prePostData.visibility || 'global');
        }
      }
      let hostedMediaUrl = null;
      if (finalMediaUri) {
        try {
          hostedMediaUrl = await uploadToCloudinary(finalMediaUri, finalMediaType);
        } catch (err) {
          Toast.show({
            type: 'error',
            text1: 'Hata',
            text2: 'Medya yüklenirken hata oluştu: ' + err.message,
          });
          setUploading(false);
          return;
        }
      }

      
      const userBlogCollectionRef = collection(db, 'Users', userId, 'blog');

      await addDoc(userBlogCollectionRef, {
        userId,
        userName: userData?.fullName || 'İsimsiz',
        content: newBlogSubject.trim(),
        title: newBlogTitle.trim(),
        mediaUri: hostedMediaUrl,
        mediaType: finalMediaType,
        shareSetting: postVisibility,
        createdAt: serverTimestamp(),
      });

      
      if (prePostId) {
        await deleteDoc(doc(db, 'prePosts', prePostId));
        console.log("prePost document deleted after publishing:", prePostId);
      }

      setNewBlogTitle(''); 
      setNewBlogSubject(''); 
      setCurrentMedia({ uri: null, type: null });

      Toast.show({
        type: 'success',
        text1: 'Başarılı',
        text2: 'Gönderi başarıyla paylaşıldı!',
      });

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainSwipe' }],
        })
      );

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: 'Gönderi paylaşılırken hata çıktı: ' + error.message,
      });
      console.error('Gönderi Hatası:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleAtPress = () => setNewBlogSubject(prev => prev + ' @');
  const handleHashPress = () => setNewBlogSubject(prev => prev + ' #');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
        >
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
              source={
                userData?.profileImageUrl
                  ? { uri: userData.profileImageUrl }
                  : require('../../assets/images/ProfileSquare.png')
              }
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{userData?.fullName || 'İsimsiz'}</Text>

              <Pressable onPress={() => navigation.navigate('BlogPublicPage', { prePostId: prePostId })} style={styles.badge}>
                <Image source={require('../../assets/images/GlobalGray.png')} style={[styles.badgeIcon, { tintColor: colors.textSub }]} />
                <Text style={styles.badgeText}>Görünürlük Ayarları</Text>
                <Image source={require('../../assets/images/GlobalA.png')} style={[styles.badgeIcon, { tintColor: colors.textSub, opacity: 0.5, marginLeft: 4 }]} />
              </Pressable>
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
            placeholder="Başlık ekle..."
            placeholderTextColor={colors.textSub}
            value={newBlogTitle}
            onChangeText={setNewBlogTitle}
            style={[styles.textInput, { minHeight: 40, flex: 0, fontWeight: 'bold' }]}
            multiline
          />

          <TextInput
            placeholder="Konu ekle..."
            placeholderTextColor={colors.textSub}
            value={newBlogSubject}
            onChangeText={setNewBlogSubject}
            style={[styles.textInput, { minHeight: null }]}
            multiline
          />

          <View style={styles.tools}>
            <Pressable onPress={handleAtPress} style={styles.toolBtn}>
              <Image source={require('../../assets/images/At.png')} style={[styles.toolIcon, { tintColor: colors.iconTint }]} />
            </Pressable>
            <Pressable onPress={handleHashPress} style={styles.toolBtn}>
              <Image source={require('../../assets/images/Hash.png')} style={[styles.toolIcon, { tintColor: colors.iconTint }]} />
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: '5%' },
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
  badgeIcon: { width: 12, height: 12, marginRight: 4 },
  badgeText: { color: colors.textSub, fontSize: 12 },
  textInput: { flex: 1, color: colors.textMain, fontSize: 16, textAlignVertical: 'top', paddingTop: 10, paddingBottom: 10, borderColor: 'transparent', borderWidth: 0, backgroundColor: 'transparent' },
  mediaBox: { width: '100%', height: SCREEN_WIDTH * 0.7, borderRadius: 15, overflow: 'hidden', marginVertical: 10, backgroundColor: '#000' },
  fullMedia: { width: '100%', height: '100%', resizeMode: 'cover' },
  tools: { flexDirection: 'row', paddingVertical: 15, marginTop: 'auto', borderTopWidth: 0.5, borderTopColor: colors.border },
  toolBtn: { marginRight: 20 },
  toolIcon: { width: 24, height: 24, resizeMode: 'contain' },
});

export default BlogPage;