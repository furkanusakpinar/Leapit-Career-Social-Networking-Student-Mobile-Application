import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import Toast from 'react-native-toast-message';
import {
  ActivityIndicator,
  Dimensions,
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
import ImageCropModal from '../components/ImageCropModal';
import { uploadToCloudinary } from '../utils/cloudinary';

const SUGGESTED_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya',
  'Adana', 'Gaziantep', 'Konya', 'Eskişehir', 'Trabzon'
];

const CreatePage2 = ({ route }) => {
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [bio, setBio] = useState(route.params?.userData?.bio || '');
  const initialLocation = route.params?.userData?.userLocation || '';
  const initialCity = route.params?.userData?.city || '';
  const initialCountry = route.params?.userData?.country || '';
  const [city, setCity] = useState(initialCity || (initialLocation ? initialLocation.split(',')[0].trim() : ''));
  const [country, setCountry] = useState(initialCountry || (initialLocation ? initialLocation.split(',')[1]?.trim() : ''));
  const [profileImageUri, setProfileImageUri] = useState(route.params?.userData?.profileImageUrl || null);
  const [bannerImageUri, setBannerImageUri] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [sentConnectionIds, setSentConnectionIds] = useState(new Set());
  const [sendingIds, setSendingIds] = useState({});
  const [currentUserData, setCurrentUserData] = useState(null);
  const [pendingCrop, setPendingCrop] = useState(null);
  const [citySuggestions, setCitySuggestions] = useState([]);

  const canSaveProfile = useMemo(() => {
    return bio.trim() !== '' && (city.trim() !== '' || country.trim() !== '') && !isLoading;
  }, [bio, city, country, isLoading]);

  useEffect(() => {
    let isMounted = true;
    const prepareData = async () => {
      const saved = await AsyncStorage.getItem('create_page2_draft');
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < 20 * 60 * 1000) {
          if (isMounted) {
            if (data.bio) setBio(data.bio);
            if (data.city) setCity(data.city);
            if (data.country) setCountry(data.country);
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
        const curSnap = await getDoc(doc(db, 'Users', userId));
        if (curSnap.exists() && isMounted) {
          setCurrentUserData(curSnap.data());
        }
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

  useEffect(() => {
    const saveDraft = async () => {
      try {
        await AsyncStorage.setItem('create_page2_draft', JSON.stringify({
          data: { bio, city, country },
          timestamp: Date.now()
        }));
      } catch (_) {}
    };
    saveDraft();
  }, [bio, city, country]);

  const cancelConnectionRequest = async (targetUser) => {
    setSendingIds(prev => ({ ...prev, [targetUser.id]: true }));
    try {
      const q = query(
        collection(db, 'connectionRequests'),
        where('senderUserId', '==', userId),
        where('receiverUserId', '==', targetUser.id),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        await updateDoc(doc(db, 'connectionRequests', querySnapshot.docs[0].id), { status: 'canceled' });
        Toast.show({ type: 'success', text1: `${targetUser.fullName} adlı kullanıcıya gönderilen bağlantı isteği iptal edildi.` });
        setSentConnectionIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUser.id);
          return newSet;
        });
      } else {
        Toast.show({ type: 'info', text1: 'İptal edilecek bekleyen bir bağlantı isteği bulunamadı.' });
      }
    } catch (error) {
      console.error("Bağlantı isteği iptal edilirken hata:", error);
      Toast.show({ type: 'error', text1: 'Bağlantı isteği iptal edilirken bir hata oluştu.' });
    } finally {
      setSendingIds(prev => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const handleConnect = async (targetUser) => {
    if (!userId) {
      Toast.show({ type: 'info', text1: 'Bağlantı isteği göndermek için giriş yapmalısınız.' });
      return;
    }
    if (sentConnectionIds.has(targetUser.id)) {
      await cancelConnectionRequest(targetUser);
      return;
    }
    setSendingIds(prev => ({ ...prev, [targetUser.id]: true }));
    try {
      await addDoc(collection(db, 'connectionRequests'), {
        senderUserId: userId,
        senderUserName: currentUserData?.fullName || currentUserData?.username || 'Anonim',
        senderUserJob: currentUserData?.job || currentUserData?.profession || 'Bilinmiyor',
        senderProfileImageUrl: currentUserData?.profileImageUrl || null,
        receiverUserId: targetUser.id,
        receiverUserName: targetUser.fullName || targetUser.username || 'Anonim',
        receiverUserJob: targetUser.job || targetUser.profession || 'Bilinmiyor',
        receiverProfileImageUrl: targetUser.profileImageUrl || null,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      Toast.show({ type: 'success', text1: `${targetUser.fullName} adlı kullanıcıya bağlantı isteğiniz gönderildi!` });
      setSentConnectionIds(prev => new Set(prev).add(targetUser.id));
    } catch (error) {
      console.error("Bağlantı isteği gönderilirken hata:", error);
      Toast.show({ type: 'error', text1: 'Bağlantı isteği gönderilirken bir hata oluştu.' });
    } finally {
      setSendingIds(prev => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setPendingCrop({ uri: result.assets[0].uri, type });
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

      await updateDoc(doc(db, 'Users', userId), {
        ...step1Payload,
        bio,
        city,
        country,
        userLocation: [city, country].map(s => s.trim()).filter(Boolean).join(', '),
        profileImageUrl: imageUrlForFirebase,
        backProfileImageUrl: backImageUrlForFirebase || null,
        profileCompleted: true,
        isProfileComplete: true,
        lastActiveAt: new Date().toISOString()
      });

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
            <View style={{ width: '100%', marginBottom: 48, marginTop: 20 }}>
              <Pressable onPress={() => pickImage('banner')} style={{ width: '100%', height: Math.round((Dimensions.get('window').width - 50) * 190 / Dimensions.get('window').width), borderRadius: 14, overflow: 'hidden', backgroundColor: colors.border }}>
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

              <View style={{ position: 'absolute', bottom: -44, left: 16 }}>
                <Pressable onPress={() => pickImage('profile')} style={{ position: 'relative' }}>
                  {profileImageUri ? (
                    <Image source={{ uri: profileImageUri }} style={{ width: 80, height: 80, borderRadius: 13, borderWidth: 3, borderColor: colors.cardBackground }} />
                  ) : (
                    <View style={{ width: 80, height: 80, borderRadius: 13, borderWidth: 3, borderColor: colors.cardBackground, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="account" size={48} color={colors.textSub} />
                    </View>
                  )}
                  <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.cardBackground }}>
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
            <View style={styles.rowFields}>
              <View style={[styles.inputContainer, styles.flex, { zIndex: 50 }]}>
                <TextInput
                  placeholder="Şehir"
                  placeholderTextColor={colors.textSub}
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    if (text.length > 0) {
                      setCitySuggestions(
                        SUGGESTED_CITIES.filter(c => c.toLowerCase().includes(text.toLowerCase())).slice(0, 5)
                      );
                    } else {
                      setCitySuggestions([]);
                    }
                  }}
                  onBlur={() => setTimeout(() => setCitySuggestions([]), 200)}
                  style={[styles.input, styles.inputInner]}
                  maxLength={40}
                />
                {citySuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {citySuggestions.map((c, index) => (
                      <Pressable
                        key={index}
                        style={[styles.suggestionItem, index === citySuggestions.length - 1 && { borderBottomWidth: 0 }]}
                        onPress={() => { setCity(c); setCitySuggestions([]); }}
                      >
                        <Text style={styles.suggestionText}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
              <View style={[styles.inputContainer, styles.flex]}>
                <TextInput
                  placeholder="Ülke"
                  placeholderTextColor={colors.textSub}
                  value={country}
                  onChangeText={setCountry}
                  style={[styles.input, styles.inputInner]}
                  maxLength={40}
                />
              </View>
            </View>

            <View style={styles.connectionSection}>
              <Text style={styles.connectionTitle}>Tanıdıklarını Bul</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.userList}
                contentContainerStyle={{ paddingLeft: 25, paddingRight: 25 }}
                nestedScrollEnabled={true}
              >
                {suggestedUsers.map((item) => {
                  const isStudent = !!(item.degree || item.branch);
                  return (
                    <View
                      key={item.id}
                      style={styles.userCard}
                    >
                      <View style={styles.cardHeaderArea}>
                        <Image
                          source={item.backProfileImageUrl ? { uri: item.backProfileImageUrl } : { uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=100&auto=format&fit=crop' }}
                          style={styles.coverImage}
                        />
                      </View>
                      <View style={styles.userCardBody}>
                        <View style={styles.userAvatarWrap}>
                          {item.profileImageUrl ? (
                            <Image source={{ uri: item.profileImageUrl }} style={styles.userAvatar} />
                          ) : (
                            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                              <MaterialCommunityIcons name="account" size={30} color={colors.textSub} />
                            </View>
                          )}
                        </View>
                        <View style={styles.userCardInfo}>
                          <Text style={styles.userName} numberOfLines={1}>{item.fullName || 'İsim Soyisim'}</Text>
                          <Text style={styles.userJob} numberOfLines={1}>
                            {isStudent
                              ? (item.branch || item.profession ? `Öğrenci • ${item.branch || item.profession}` : 'Öğrenci')
                              : (item.profession || 'Üye')}
                          </Text>
                          <View style={styles.userDetailRow}>
                            <MaterialCommunityIcons name="school-outline" size={11} color={colors.textSub} />
                            <Text style={styles.userDetailText} numberOfLines={1}>{item.school || 'Okul bilgisi yok'}</Text>
                          </View>
                          <View style={styles.userDetailRow}>
                            <MaterialCommunityIcons name="briefcase-outline" size={11} color={colors.textSub} />
                            <Text style={styles.userDetailText} numberOfLines={1}>
                              {isStudent ? 'Şirket yok' : (item.company || 'Şirket bilgisi yok')}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Pressable
                        style={[styles.connectButton, sentConnectionIds.has(item.id) && styles.connectedButton]}
                        onPress={() => handleConnect(item)}
                        disabled={!!sendingIds[item.id]}
                      >
                        {sendingIds[item.id] ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Ionicons name={sentConnectionIds.has(item.id) ? "checkmark" : "person-add"} size={14} color="#FFF" />
                        )}
                        <Text style={styles.connectButtonText}>
                          {sentConnectionIds.has(item.id) ? 'İstek Gönderildi' : 'Bağlantı kur'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
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

      <ImageCropModal
        visible={!!pendingCrop}
        imageUri={pendingCrop?.uri}
        aspect={pendingCrop?.type === 'banner' ? Dimensions.get('window').width / 190 : 1}
        onCancel={() => setPendingCrop(null)}
        onConfirm={(uri) => {
          if (pendingCrop?.type === 'banner') setBannerImageUri(uri);
          else setProfileImageUri(uri);
          setPendingCrop(null);
        }}
      />
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
  input: { backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, color: colors.textMain, fontSize: 16, marginBottom: 12, justifyContent: 'center' },
  bioInput: { height: 80, textAlignVertical: 'top' },
  flex: { flex: 1 },
  rowFields: { flexDirection: 'row', gap: 10 },
  inputContainer: {
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 0,
    height: 50,
    marginBottom: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  inputInner: {
    marginBottom: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  suggestionBox: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  suggestionText: { color: colors.textMain, fontSize: 14 },
  connectionSection: { marginVertical: 8 },
  connectionTitle: { color: colors.textMain, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  userList: { height: 175, marginHorizontal: -25 },
  userCard: { backgroundColor: colors.cardBackground, width: 200, borderRadius: 14, marginRight: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, paddingBottom: 12 },
  cardHeaderArea: { width: '100%', height: 52, backgroundColor: colors.border },
  coverImage: { width: '100%', height: '100%', opacity: 0.5 },
  userCardBody: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 2 },
  userAvatarWrap: { marginTop: -22, borderWidth: 3, borderColor: colors.cardBackground, borderRadius: 14, backgroundColor: colors.border, overflow: 'hidden', zIndex: 1, alignSelf: 'flex-start' },
  userAvatar: { width: 48, height: 48, resizeMode: 'cover', backgroundColor: colors.border },
  userAvatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  userCardInfo: { flex: 1, marginLeft: 10, marginTop: 8 },
  userName: { color: colors.textMain, fontSize: 14, fontWeight: 'bold' },
  userJob: { color: colors.textSub, fontSize: 12, marginTop: 2 },
  userDetailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  userDetailText: { color: colors.textSub, fontSize: 11, marginLeft: 3, flex: 1 },
  connectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 10, height: 36,
    marginHorizontal: 12, marginTop: 12, gap: 5,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 3,
  },
  connectedButton: { backgroundColor: '#00BA7C', shadowColor: '#00BA7C' },
  connectButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  button: { backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  disabledButton: { opacity: 0.5 },
  studentButton: { marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  studentText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
});

export default CreatePage2;