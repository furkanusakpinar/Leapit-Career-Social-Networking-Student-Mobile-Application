import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { collection, doc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView, Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text, TextInput,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux'; 
import { db } from '../../firebaseConfig';
import { setAuth, setProfileStep } from '../redux/userSlice';
import CreateProfile2Skeleton from '../skeleton/CreateProfile2Skeleton';
import { lightTheme, darkTheme } from '../theme/colors';
import { uploadToCloudinary } from '../utils/cloudinary';

const CreatePage2 = ({ route }) => {
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [bio, setBio] = useState(route.params?.userData?.bio || '');
  const [userLocation, setUserLocation] = useState(route.params?.userData?.userLocation || '');
  const [profileImageUri, setProfileImageUri] = useState(route.params?.userData?.profileImageUrl || null);
  const [bannerImageUri, setBannerImageUri] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [connectedIds, setConnectedIds] = useState(new Set());

  const canSaveProfile = useMemo(() => {
    return bio.trim() !== '' && userLocation.trim() !== '' && !isLoading;
  }, [bio, userLocation, isLoading]);

  useEffect(() => {
    let isMounted = true;
    const prepareData = async () => {
      // Son 20 dk içindeki ilerlemeyi geri yükle
      const saved = await AsyncStorage.getItem('create_page2_draft');
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < 20 * 60 * 1000) {
          if (isMounted) {
            if (data.bio) setBio(data.bio);
            if (data.userLocation) setUserLocation(data.userLocation);
          }
        } else {
          await AsyncStorage.removeItem('create_page2_draft');
        }
      }

      if (!userId) {
        if (isMounted) setPageLoading(false);
        return;
      }
      try {
        const usersRef = collection(db, 'Users');
        const q = query(usersRef, where('__name__', '!=', userId), limit(6));
        const querySnapshot = await getDocs(q);
        const users = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.profileCompleted === true || data.isProfileComplete === true) {
            users.push({ id: doc.id, ...data });
          }
        });
        if (isMounted) {
          setSuggestedUsers(users);
          setPageLoading(false);
        }
      } catch (error) {
        console.error('Hata:', error);
      }
    };
    prepareData();
    return () => { isMounted = false; };
  }, [userId]);

  // Bio ve konum değişikliklerini otomatik kaydet
  useEffect(() => {
    const saveDraft = async () => {
      try {
        await AsyncStorage.setItem('create_page2_draft', JSON.stringify({
          data: { bio, userLocation },
          timestamp: Date.now()
        }));
      } catch (_) {}
    };
    saveDraft();
  }, [bio, userLocation]);

  const handleConnect = (id) => {
    setConnectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'banner' ? [16, 6] : [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      if (type === 'banner') setBannerImageUri(result.assets[0].uri);
      else setProfileImageUri(result.assets[0].uri);
    }
  };

  const uploadImageAndSaveProfile = async () => {
    if (!userId || !canSaveProfile) return;
    setIsLoading(true);
    try {
      let imageUrlForFirebase = profileImageUri;
      let backImageUrlForFirebase = bannerImageUri;

      if (profileImageUri && !profileImageUri.startsWith('http')) {
        imageUrlForFirebase = await uploadToCloudinary(profileImageUri, 'image');
      }

      if (bannerImageUri && !bannerImageUri.startsWith('http')) {
        backImageUrlForFirebase = await uploadToCloudinary(bannerImageUri, 'image');
      }

      // 1. Aşama taslak verilerini AsyncStorage'dan oku
      let step1Payload = {};
      const profRaw = await AsyncStorage.getItem('create_profile_draft');
      const studRaw = await AsyncStorage.getItem('student_page_draft');
      
      let profData = null;
      let studData = null;
      
      if (profRaw) {
        const parsed = JSON.parse(profRaw);
        if (Date.now() - parsed.timestamp < 20 * 60 * 1000) profData = parsed;
      }
      if (studRaw) {
        const parsed = JSON.parse(studRaw);
        if (Date.now() - parsed.timestamp < 20 * 60 * 1000) studData = parsed;
      }

      if (profData && studData) {
        // En güncel olanı seç
        if (profData.timestamp > studData.timestamp) {
          step1Payload = {
            profession: profData.data.profession || '',
            employmentType: profData.data.employmentType || '',
            company: profData.data.company || '',
            school: profData.data.school || ''
          };
        } else {
          step1Payload = {
            school: studData.data.schoolName || '',
            degree: studData.data.degree || '',
            branch: studData.data.branch || '',
            startYear: studData.data.startYear || '',
            endYear: studData.data.endYear || '',
            isOver16: studData.data.isOver16 ?? true,
          };
          if (!studData.data.isOver16 && studData.data.birthDay) {
            step1Payload.birthDate = `${studData.data.birthDay}-${studData.data.birthMonth}-${studData.data.birthYear}`;
          }
        }
      } else if (profData) {
        step1Payload = {
          profession: profData.data.profession || '',
          employmentType: profData.data.employmentType || '',
          company: profData.data.company || '',
          school: profData.data.school || ''
        };
      } else if (studData) {
        step1Payload = {
          school: studData.data.schoolName || '',
          degree: studData.data.degree || '',
          branch: studData.data.branch || '',
          startYear: studData.data.startYear || '',
          endYear: studData.data.endYear || '',
          isOver16: studData.data.isOver16 ?? true,
        };
        if (!studData.data.isOver16 && studData.data.birthDay) {
          step1Payload.birthDate = `${studData.data.birthDay}-${studData.data.birthMonth}-${studData.data.birthYear}`;
        }
      }

      // Tüm verileri bir kerede Firestore'a kaydet
      await updateDoc(doc(db, 'Users', userId), {
        ...step1Payload,
        bio,
        userLocation,
        profileImageUrl: imageUrlForFirebase,
        backProfileImageUrl: backImageUrlForFirebase || null,
        profileCompleted: true,
        isProfileComplete: true,
        lastActiveAt: new Date().toISOString()
      });

      // Başarılı kayıt — tüm taslakları temizle
      await AsyncStorage.multiRemove(['create_profile_draft', 'student_page_draft', 'create_page2_draft', 'step1_completed']);
      dispatch(setProfileStep(null));
      dispatch(setAuth(true));
    } catch (e) {
      console.error("Profile save error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleSkip = () => {
    dispatch(setAuth(true));
  };

  if (pageLoading) return <CreateProfile2Skeleton />;

  return (
    <View style={styles.container}>
      {}
      <View style={styles.headerFixed}>
        <Text style={styles.brandTagline}>Profilini Tamamla 2/2</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >

          <View style={styles.loginCard}>
            {/* Banner */}
            <View style={{ width: '100%', marginBottom: 48, marginTop: 20 }}>
              <Pressable onPress={() => pickImage('banner')} style={{ width: '100%', height: 110, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.border }}>
                {bannerImageUri ? (
                  <Image source={{ uri: bannerImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="image-outline" size={26} color={colors.textSub} />
                  </View>
                )}
                <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 15 }}>
                  <Ionicons name="camera" size={14} color="white" />
                </View>
              </Pressable>

              {/* Avatar — bannerın sol altına bindirme */}
              <View style={{ position: 'absolute', bottom: -44, left: 16 }}>
                <Pressable onPress={() => pickImage('profile')} style={{ position: 'relative' }}>
                  {profileImageUri ? (
                    <Image source={{ uri: profileImageUri }} style={{ width: 80, height: 80, borderRadius: 13, borderWidth: 3, borderColor: colors.cardBackground }} />
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

            <Text style={styles.titleText}>Hakkımda</Text>
            <TextInput
              placeholder="Kendinizden bahsedin..."
              placeholderTextColor={colors.textSub}
              style={[styles.input, styles.bioInput]}
              multiline
              value={bio}
              onChangeText={setBio}
              maxLength={500}
            />

            <Text style={styles.titleText}>Konum *</Text>
            <TextInput
              placeholder="Şehir, Ülke"
              placeholderTextColor={colors.textSub}
              style={[styles.input, styles.locationInput]}
              value={userLocation}
              onChangeText={setUserLocation}
              maxLength={100}
            />

            <View style={styles.connectionSection}>
              <Text style={styles.connectionTitle}>Tanıdıklarını Bul</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.userList}
                contentContainerStyle={{ paddingRight: 25 }}
                nestedScrollEnabled={true}
              >
                {suggestedUsers.map((item) => (
                  <View key={item.id} style={styles.userCard}>
                    <View style={styles.cardHeaderArea}>
                      <Image
                        source={item.backProfileImageUrl ? { uri: item.backProfileImageUrl } : { uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=100&auto=format&fit=crop' }}
                        style={styles.coverImage}
                      />
                    </View>
                    {item.profileImageUrl ? (
                      <Image source={{ uri: item.profileImageUrl }} style={styles.suggestedUserImage} />
                    ) : (
                      <View style={[styles.suggestedUserImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border }]}>
                        <MaterialCommunityIcons name="account-circle" size={56} color={colors.textSub} />
                      </View>
                    )}
                    <View style={styles.userCardInfo}>
                      <Text style={styles.userName} numberOfLines={1}>{item.fullName || 'İsim Soyisim'}</Text>
                      <Text style={styles.userTitle} numberOfLines={1}>{item.jobTitle || 'Üye'}</Text>
                      <Pressable
                        style={[styles.connectButton, connectedIds.has(item.id) && styles.connectedButton]}
                        onPress={() => handleConnect(item.id)}
                      >
                        <Ionicons name={connectedIds.has(item.id) ? "checkmark" : "person-add"} size={14} color={connectedIds.has(item.id) ? "white" : colors.primary} />
                        <Text style={[styles.connectButtonText, { color: connectedIds.has(item.id) ? "white" : colors.primary }]}>
                          {connectedIds.has(item.id) ? 'Bağlanıldı' : 'Bağlan'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <Pressable
              style={[styles.button, !canSaveProfile && styles.disabledButton]}
              onPress={uploadImageAndSaveProfile}
              disabled={!canSaveProfile}
            >
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>İleri</Text>}
            </Pressable>

            <Pressable style={styles.studentButton} onPress={handleSkip}>
              <Text style={styles.studentText}>Şimdilik Geç</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerFixed: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 100
  },
  brandTagline: { color: colors.textMain, fontSize: 22, fontWeight: 'bold' },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },

  loginCard: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    width: '100%',
    zIndex: 2,
    marginTop: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  bannerContainer: { width: '100%', height: 120, zIndex: 1, marginTop: 20, borderRadius: 20, overflow: 'hidden' },
  bannerPressable: { width: '100%', height: '100%', backgroundColor: colors.border },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerPlaceholderText: { color: colors.textSub, fontSize: 12, marginTop: 5, fontWeight: '600' },
  bannerCameraIcon: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, borderRadius: 20
  },

  profileImageWrapper: {
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 15,
    zIndex: 3
  },
  imagePressable: { position: 'relative' },
  profileImage: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: colors.cardBackground,
    backgroundColor: colors.border
  },
  cameraIconBadge: {
    position: 'absolute', bottom: 5, right: 5, backgroundColor: colors.primary,
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', borderWidth: 3, borderColor: colors.cardBackground
  },

  titleText: { color: colors.textSub, marginBottom: 4, fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border, borderRadius: 10, padding: 10, color: colors.textMain, fontSize: 14, marginBottom: 8 },
  bioInput: { height: 80, textAlignVertical: 'top' },
  locationInput: { height: 50 },
  connectionSection: { marginVertical: 8 },
  connectionTitle: { color: colors.textMain, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  userList: { height: 165 },
  userCard: { backgroundColor: colors.background, width: 150, height: 160, borderRadius: 12, marginRight: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardHeaderArea: { width: '100%', height: 45, backgroundColor: colors.border },
  coverImage: { width: '100%', height: '100%', opacity: 0.5 },
  suggestedUserImage: { width: 60, height: 60, borderRadius: 30, marginTop: -25, alignSelf: 'center', borderWidth: 2, borderColor: colors.border, zIndex: 1 },
  userCardInfo: { alignItems: 'center', paddingHorizontal: 4, flex: 1, justifyContent: 'space-evenly', paddingBottom: 4 },
  userName: { color: colors.textMain, fontSize: 12, fontWeight: 'bold' },
  userTitle: { color: colors.textSub, fontSize: 10 },
  connectButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.border,
    paddingVertical: 5, width: '90%', justifyContent: 'center', borderRadius: 6, gap: 4, borderWidth: 1, borderColor: colors.primary
  },
  connectedButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  connectButtonText: { fontSize: 10, fontWeight: 'bold' },
  button: { backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  disabledButton: { opacity: 0.5 },
  studentButton: { marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  studentText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
});

export default CreatePage2;