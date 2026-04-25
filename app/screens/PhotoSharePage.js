import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';
import VideoPlayer from '../components/VideoPlayer';

export function PhotoSharePage() {
  const navigation = useNavigation();
  const route = useRoute();
  const userId = useSelector(state => state.user.userId);
  const insets = useSafeAreaInsets();

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [selectedMediaUri, setSelectedMediaUri] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState(null);
  const [prePostId, setPrePostId] = useState(null);
  const [mediaDimensions, setMediaDimensions] = useState({ width: 0, height: 0 });
  const timeoutRef = useRef(null);

  const previousScreen = route.params?.previousScreen || 'MainSwipe';

  
  useEffect(() => {
    if (!userId || !selectedMediaUri) {
      return;
    }

    let currentPrePostId = prePostId;
    if (!currentPrePostId) {
      currentPrePostId = doc(collection(db, 'prePosts')).id;
      setPrePostId(currentPrePostId);
    }

    const updatePrePost = async () => {
      try {
        const prePostRef = doc(db, 'prePosts', currentPrePostId);
        const expiresAt = new Date(Date.now() + 60 * 10000);

        await setDoc(prePostRef, {
          userId: userId,
          mediaUri: selectedMediaUri,
          mediaType: selectedMediaType,
          createdAt: serverTimestamp(),
          expiresAt: expiresAt,
          visibility: 'global',
          use: 'Post',
          comments: 'Comment',
        }, { merge: true });
        console.log("prePost document created/updated:", currentPrePostId);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(async () => {
          try {
            await deleteDoc(prePostRef);
            console.log("prePost document deleted due to timeout:", currentPrePostId);
          } catch (error) {
            console.error("Error deleting prePost due to timeout:", error);
          }
        }, 60 * 1000 + 5000);
      } catch (error) {
        console.error("Error creating/updating prePost document:", error);
        Alert.alert("Hata", "Geçici gönderi oluşturulurken bir hata oluştu: " + error.message);
      }
    };

    updatePrePost();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [selectedMediaUri, selectedMediaType, userId]);

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'İzin Reddedildi',
          'Medya kütüphanesi izni verilmediği için fotoğraf veya video seçilemiyor.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedMediaUri(asset.uri);
        setSelectedMediaType(asset.type.includes('image') ? 'image' : 'video');
        setMediaDimensions({
          width: asset.width,
          height: asset.height,
        });

        setPrePostId(null);
      }
    } catch (err) {
      Alert.alert('Medya Yüklenemedi', 'Medya yüklenirken bir hata oluştu: ' + err.message);
    }
  };

  const handleNavigationToSharePage = (id) => {
    if (id) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      navigation.navigate('SharePage', {
        prePostId: id,
      });
    } else {
      navigation.navigate('SharePage');
    }
  };

  const handleNext = async () => {
    if (selectedMediaUri) {
      let idToUse = prePostId;
      if (!idToUse) {
        idToUse = doc(collection(db, 'prePosts')).id;
        setPrePostId(idToUse);
      }

      try {
        const prePostRef = doc(db, 'prePosts', idToUse);
        const expiresAt = new Date(Date.now() + 60 * 10000);
        await setDoc(prePostRef, {
          userId: userId,
          mediaUri: selectedMediaUri,
          mediaType: selectedMediaType,
          createdAt: serverTimestamp(),
          expiresAt: expiresAt,
          visibility: 'global',
          use: 'Post',
          comments: 'Comment',
        }, { merge: true });
        console.log("prePost document created/updated by handleNext:", idToUse);
        handleNavigationToSharePage(idToUse);
      } catch (error) {
        console.error("Error creating/updating prePost document in handleNext:", error);
        Alert.alert("Hata", "Gönderi hazırlanırken bir hata oluştu: " + error.message);
      }
    } else {
      Alert.alert('Uyarı', 'Lütfen devam etmek için bir fotoğraf veya video seçin.');
    }
  };

  const handleSkip = () => {
    handleNavigationToSharePage(null);
  };

  const getMediaStyle = () => {
    if (!selectedMediaUri) return {};
    const containerWidth = '80%';
    const containerHeight = '80%';
    const { width, height } = mediaDimensions;

    if (width === 0 || height === 0) return { width: containerWidth, height: containerHeight };

    const aspectRatio = width / height;
    const containerAspectRatio = '80%' / '80%'; 

    let newWidth, newHeight;
    if (aspectRatio > containerAspectRatio) {
      newWidth = containerWidth;
      newHeight = containerWidth / aspectRatio;
    } else {
      newHeight = containerHeight;
      newWidth = containerHeight * aspectRatio;
    }

    return {
      width: newWidth,
      height: newHeight,
      resizeMode: 'contain',
    };
  };

  const previewStyle = getMediaStyle();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={15} style={styles.backButtonContainer}>
              <Image source={require('../../assets/images/back.png')} style={[styles.iconBack, { tintColor: colors.iconTint }]} />
            </Pressable>
            <Text style={styles.headerTitle}>Yeni Gönderi</Text>
            <View style={styles.headerRightPlaceholder} />
          </View>

          {selectedMediaUri ? (
            <>
              <View style={styles.mediaPreviewContainer}>
                {selectedMediaType === 'image' ? (
                  <Image source={{ uri: selectedMediaUri }} style={[styles.mediaPreview, previewStyle]} />
                ) : (
                  <VideoPlayer
                    videoUri={selectedMediaUri}
                    style={styles.videoPlayerWrapper}
                    videoStyle={[styles.mediaPreview, previewStyle]}
                  />
                )}
              </View>
              <Pressable onPress={handleImagePick} style={styles.standaloneChangeButton}>
                <Ionicons name="refresh-outline" size={24} color="white" />
                <Text style={styles.standaloneChangeButtonText}>Değiştir</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={handleImagePick} style={styles.selectPhotoPlaceholder}>
              <Ionicons name="images-outline" size={60} color={colors.textSub} />
              <Text style={styles.selectPhotoText}>Fotoğraf veya Video Seçmek İçin Tıkla</Text>
            </Pressable>
          )}

          <View style={styles.buttonContainer}>
            <Pressable onPress={handleSkip} style={[styles.button, styles.skipButton]}>
              <Text style={styles.buttonText}>Geç</Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              style={[styles.button, styles.nextButton, !selectedMediaUri && styles.disabledButton]}
              disabled={!selectedMediaUri}
            >
              <Text style={styles.buttonText}>İleri</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { padding: '5%', flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: '5%',
  },
  backButtonContainer: {
    padding: 5,
  },
  headerRightPlaceholder: {
    width: 34, 
  },
  iconBack: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    marginBottom: '3%',
  },
  selectPhotoText: {
    color: colors.textSub,
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  mediaPreviewContainer: {
    alignSelf: 'center',
    width: '80%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: '3%',
    backgroundColor: colors.cardBackground,
  },
  mediaPreview: {
    resizeMode: 'contain',
  },
  videoPlayerWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  standaloneChangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: -10, 
    marginBottom: '3%',
  },
  standaloneChangeButtonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  skipButton: {
    backgroundColor: colors.border,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default PhotoSharePage;
