import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text, TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import BottomSheet from '../components/BottomSheet';
import LoginSkeleton from '../skeleton/LoginSkeleton';

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');

const PARTICLE_COUNT = 15;
const PARTICLE_SPEED = 30000;

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const ParticleBackground = ({ color = 'rgba(255,255,255,0.8)' }) => {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: new Animated.Value(randomBetween(0, WIN_W)),
      y: new Animated.Value(randomBetween(0, WIN_H)),
      size: randomBetween(6, 18),
      opacity: new Animated.Value(randomBetween(0.25, 0.65)),
      duration: randomBetween(PARTICLE_SPEED * 0.8, PARTICLE_SPEED * 1.4),
    })),
    []);

  useEffect(() => {
    const animateParticle = (p) => {
      const nextX = randomBetween(0, WIN_W);
      const nextY = randomBetween(0, WIN_H);
      const nextOpacity = randomBetween(0.2, 0.6);
      Animated.parallel([
        Animated.timing(p.x, { toValue: nextX, duration: p.duration, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(p.y, { toValue: nextY, duration: p.duration, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(p.opacity, { toValue: nextOpacity, duration: p.duration / 2, useNativeDriver: true }),
      ]).start(() => animateParticle(p));
    };
    particles.forEach(p => animateParticle(p));
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} pointerEvents="none">
      {particles.map(p => (
        <Animated.View
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: color,
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }],
          }}
        />
      ))}
    </View>
  );
};


import { setAuth, setProfileStep, setUserId } from '../redux/userSlice';


import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { darkTheme, lightTheme } from '../theme/colors';
import { hashPassword } from '../utils/hash';

const SCREEN_WIDTH = WIN_W;


const image1 = require('../../assets/images/AIPhoto1.png');
const image2 = require('../../assets/images/AIPhoto4.png');
const image3 = require('../../assets/images/AIPhoto3.png');
const image4 = require('../../assets/images/AIPhoto2.png');
const checkIcon = require('../../assets/images/Check.png');

const emailIcon = require('../../assets/images/emailIcon.png');
const passwordIcon = require('../../assets/images/PasswordIcon.png');
const eyeIcon = require('../../assets/images/eye.png');
const eyeOffIcon = require('../../assets/images/eyeOff.png');

const LoginPage = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const profileStep = useSelector(state => state.user.profileStep);
  const reduxUserId = useSelector(state => state.user.userId);
  const userInfo = useSelector(state => state.user.userInfo);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [pendingResume, setPendingResume] = useState(null);

  useEffect(() => {
    if (profileStep && reduxUserId) {
      openSheet({ docId: reduxUserId, step: profileStep, fullName: userInfo?.fullName || '' });
    }
  }, [profileStep, reduxUserId]);

  const openSheet = (data) => {
    setPendingResume(data);
    setSheetVisible(true);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setPendingResume(null);
  };

  const handleResumeYes = async () => {
    if (!pendingResume) return;
    closeSheet();
    dispatch(setUserId(pendingResume.docId));
    dispatch(setProfileStep(pendingResume.step));

    let currentEmail = email;
    let currentPassword = password;
    if (!currentPassword) {
      const saved = await AsyncStorage.getItem('userCredentials');
      if (saved) {
        const parsed = JSON.parse(saved);
        currentEmail = parsed.email;
        currentPassword = parsed.password;
      }
    }

    if (rememberMe || (!email && currentEmail)) {
      await AsyncStorage.setItem('userCredentials', JSON.stringify({ email: currentEmail.trim().toLowerCase(), password: currentPassword }));
      await AsyncStorage.setItem('userId', pendingResume.docId);
    }
    navigation.replace(pendingResume.step);
  };

  const handleResumeNo = async () => {
    if (!pendingResume) return;
    closeSheet();
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'Users', pendingResume.docId));
      await AsyncStorage.multiRemove(['create_profile_draft', 'create_page2_draft', 'student_page_draft', 'step1_completed']);

      let currentEmail = email;
      let currentPassword = password;
      if (!currentPassword) {
        const saved = await AsyncStorage.getItem('userCredentials');
        if (saved) {
          const parsed = JSON.parse(saved);
          currentEmail = parsed.email;
          currentPassword = parsed.password;
        }
      }

      const usersRef = collection(db, 'Users');
      const hashedPassword = hashPassword(currentPassword);
      const docRef = await addDoc(usersRef, {
        fullName: pendingResume.fullName || '',
        email: currentEmail.trim().toLowerCase(),
        password: hashedPassword,
        createdAt: new Date().toISOString()
      });
      dispatch(setUserId(docRef.id));
      dispatch(setProfileStep('CreateProfile'));
      if (rememberMe || (!email && currentEmail)) {
        await AsyncStorage.setItem('userCredentials', JSON.stringify({ email: currentEmail.trim().toLowerCase(), password: currentPassword }));
        await AsyncStorage.setItem('userId', docRef.id);
      }
      navigation.replace('CreateProfile');
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'custom_error', text1: 'Hata', text2: 'İşlem tamamlanamadı.' });
    } finally {
      setIsLoading(false);
    }
  };


  const animValue1 = useRef(new Animated.Value(0)).current;
  const animValue2 = useRef(new Animated.Value(0)).current;
  const animValue3 = useRef(new Animated.Value(0)).current;
  const animValue4 = useRef(new Animated.Value(0)).current;
  const [zIndices, setZIndices] = useState([4, 3, 2, 1]);


  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadSavedData = async () => {
        try {
          if (isMounted) setIsPageLoading(true);
          const saved = await AsyncStorage.getItem('userCredentials');
          if (saved && isMounted) {
            const { email: sEmail, password: sPassword } = JSON.parse(saved);
            setEmail(sEmail);
            setPassword(sPassword);
            setRememberMe(true);
          }
          if (isMounted) setTimeout(() => setIsPageLoading(false), 800);
        } catch (e) {
          console.log("Yükleme hatası:", e);
        }
      };
      loadSavedData();
      return () => { isMounted = false; };
    }, [])
  );


  useEffect(() => {
    let loopTimeout;
    const animateLoop = () => {
      const config = { duration: 500, useNativeDriver: false, easing: Easing.linear };
      Animated.parallel([
        Animated.timing(animValue1, { ...config, toValue: (animValue1.__getValue() + 1) % 4 }),
        Animated.timing(animValue2, { ...config, toValue: (animValue2.__getValue() + 1) % 4 }),
        Animated.timing(animValue3, { ...config, toValue: (animValue3.__getValue() + 1) % 4 }),
        Animated.timing(animValue4, { ...config, toValue: (animValue4.__getValue() + 1) % 4 }),
      ]).start(() => {
        loopTimeout = setTimeout(animateLoop, 4000);
      });
    };
    animateLoop();
    return () => clearTimeout(loopTimeout);
  }, []);

  const handleLogin = async () => {
    if (isLoading) return;
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'custom_error', text1: 'Hata', text2: 'E-posta ve şifre boş olamaz.' });
      return;
    }
    setIsLoading(true);
    try {
      const q = query(collection(db, 'Users'), where('email', '==', email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        Toast.show({ type: 'custom_error', text1: 'Hata', text2: 'Kullanıcı bulunamadı.' });
        setIsLoading(false);
        return;
      }
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const hashedPassword = hashPassword(password);
      if (userData.password !== hashedPassword && userData.password !== password) {
        Toast.show({ type: 'custom_error', text1: 'Hata', text2: 'Şifre yanlış.' });
        setIsLoading(false);
        return;
      }
      if (userData.password === password) {
        try {
          await updateDoc(doc(db, 'Users', userDoc.id), { password: hashedPassword });
          console.log(`Successfully migrated user ${userDoc.id} password to SHA-256 hash.`);
        } catch (e) {
          console.error("Failed to migrate password to hash:", e);
        }
      }
      const userId = userDoc.id;

      if (!userData.profileCompleted) {
        const createdAt = userData.createdAt ? new Date(userData.createdAt).getTime() : 0;
        const elapsedMs = Date.now() - createdAt;
        const TWENTY_MINUTES = 20 * 60 * 1000;

        if (elapsedMs <= TWENTY_MINUTES) {
          let step = 'CreateProfile';
          try {
            const step1Raw = await AsyncStorage.getItem('step1_completed');
            if (step1Raw) {
              const parsed = JSON.parse(step1Raw);
              if (Date.now() - parsed.timestamp < TWENTY_MINUTES) {
                step = 'CreatePage2';
              }
            }
          } catch (_) { }
          setIsLoading(false);
          openSheet({ docId: userId, step, fullName: userData.fullName });
          return;
        } else {
          await deleteDoc(doc(db, 'Users', userId));
          await AsyncStorage.multiRemove([
            'create_profile_draft',
            'create_page2_draft',
            'student_page_draft',
            'step1_completed',
            'userId',
            'userCredentials'
          ]);
          Toast.show({
            type: 'custom_error',
            text1: 'Hesap Silindi',
            text2: 'Kayıt süreniz (20 dk) dolduğu için hesabınız silinmiştir. Lütfen yeniden kaydolun.'
          });
          setIsLoading(false);
          return;
        }
      }

      if (rememberMe) {
        await AsyncStorage.setItem('userCredentials', JSON.stringify({ email: email.trim().toLowerCase(), password }));
        await AsyncStorage.setItem('userId', userId);
      }
      dispatch(setUserId(userId));
      dispatch(setAuth(true));
    } catch (error) {
      console.error('Login Error:', error);
      Toast.show({ type: 'custom_error', text1: 'Hata', text2: 'Giriş yapılırken sorun oluştu.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getImageStyle = (animValue, startPos) => {

    const positions = [
      { size: 140, top: 110, left: (SCREEN_WIDTH / 2) - 70 },
      { size: 130, top: 20, left: -20 },
      { size: 120, top: -80, left: (SCREEN_WIDTH / 2) - 60 },
      { size: 110, top: 20, left: SCREEN_WIDTH * 0.75 },
    ];

    const order = Array.from({ length: 5 }, (_, i) => positions[(startPos + i) % 4]);

    return {
      width: animValue.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: order.map(p => p.size) }),
      height: animValue.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: order.map(p => p.size) }),
      top: animValue.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: order.map(p => p.top) }),
      left: animValue.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: order.map(p => p.left) }),
      position: 'absolute'
    };
  };


  if (isPageLoading) return <LoginSkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <ParticleBackground color={themeMode === 'dark' ? 'rgba(100,149,237,0.45)' : 'rgba(80,80,180,0.35)'} />
      <View style={[styles.container, { paddingBottom: Platform.OS === 'ios' ? keyboardHeight : 0 }]}>
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <View style={styles.topSection}>
            {!isKeyboardVisible && (
              <View style={styles.imageContainer}>
                {[animValue1, animValue2, animValue3, animValue4].map((anim, i) => (
                  <Animated.View key={i} style={[styles.circleImageWrapper, getImageStyle(anim, i), { zIndex: zIndices[i] }]}>
                    <Image source={[image1, image2, image3, image4][i]} style={styles.circleImage} />
                  </Animated.View>
                ))}
              </View>
            )}
            <Text style={[styles.brandName, isKeyboardVisible && { marginTop: 20 }]}>
              Leapit <Text style={styles.brandTagline}>Her şey{"\n"}Daha Kolay</Text>
            </Text>
          </View>

          <View style={[styles.loginCard, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 50 : 60 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Leapit yeni misiniz?</Text>
              <Pressable onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.cardHeaderLink}>Kayıt Ol</Text>
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Image source={emailIcon} style={[styles.inputIcon, { tintColor: colors.iconTint }]} />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor={colors.textSub}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Image source={passwordIcon} style={[styles.inputIcon, { tintColor: colors.iconTint }]} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor={colors.textSub}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Image
                  source={showPassword ? eyeOffIcon : eyeIcon}
                  style={[showPassword ? styles.hidePasswordIcon : styles.showPasswordIcon, { tintColor: colors.iconTint }]}
                />
              </Pressable>
            </View>

            <Pressable style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Image source={checkIcon} style={styles.checkIcon} />}
              </View>
              <Text style={styles.rememberText}>Beni hatırla</Text>
            </Pressable>

            <Pressable style={styles.button} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
            </Pressable>
          </View>
        </View>
      </View>


      <BottomSheet visible={sheetVisible} onClose={closeSheet} title="Kaldığın Yerden Devam Et" subtitle="Profil tamamlama işleminiz yarım kalmış. Devam etmek ister misiniz?" contentStyle={bsStyles.content} hideCloseIcon dismissOnContentSwipe>
        <Pressable style={[bsStyles.btnYes, { backgroundColor: colors.primary }]} onPress={handleResumeYes}>
          <Text style={bsStyles.btnYesText}>Evet, Devam Et</Text>
        </Pressable>
        <Pressable style={[bsStyles.btnNo, { borderColor: colors.border }]} onPress={handleResumeNo}>
          <Text style={[bsStyles.btnNoText, { color: colors.textSub }]}>Hayır, Baştan Başla</Text>
        </Pressable>
      </BottomSheet>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'flex-end' },
  topSection: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  imageContainer: { position: 'relative', height: 150, width: '100%', marginTop: 30 },
  circleImageWrapper: { position: 'absolute', borderRadius: 100, overflow: 'hidden' },
  circleImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  brandName: { color: colors.primary, fontSize: 25, fontWeight: 'bold', marginTop: 100, textAlign: 'center' },
  brandTagline: { color: colors.textMain, fontSize: 22, fontWeight: 'bold' },
  loginCard: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, zIndex: 10, elevation: 10, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  cardHeader: { alignItems: 'center', marginBottom: 20, gap: 5 },
  cardHeaderText: { color: colors.textSub, fontSize: 15 },
  cardHeaderLink: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border, borderWidth: 1, borderColor: colors.border, borderRadius: 12, height: 50, paddingHorizontal: 15, marginBottom: 15 },
  inputIcon: { width: 24, height: 24, marginRight: 10 },
  input: { flex: 1, color: colors.textMain, fontSize: 16 },
  showPasswordIcon: { width: 24, height: 24 },
  hidePasswordIcon: { width: 20, height: 20 },
  button: { height: 55, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkIcon: { width: 14, height: 14, tintColor: 'white' },
  rememberText: { color: colors.textSub, fontSize: 14 }
});



const bsStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  btnYes: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  btnYesText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  btnNo: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 24,
  },
  btnNoText: {
    fontWeight: '700',
    fontSize: 16,
  },
});

export default LoginPage;