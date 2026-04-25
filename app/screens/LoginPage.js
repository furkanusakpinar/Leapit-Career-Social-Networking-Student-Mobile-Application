import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView, Platform,
  Pressable,
  StyleSheet,
  Text, TextInput,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import LoginSkeleton from '../skeleton/LoginSkeleton';


import { setAuth, setUserId } from '../redux/userSlice';


import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


const image1 = require('../../assets/images/AIPhoto1.png');
const image2 = require('../../assets/images/AIPhoto4.png');
const image3 = require('../../assets/images/AIPhoto3.png');
const image4 = require('../../assets/images/AIPhoto2.png');
const checkIcon = require('../../assets/images/Check.png');
const warningIcon = require('../../assets/images/warningIcon.png');
const emailIcon = require('../../assets/images/emailIcon.png');
const passwordIcon = require('../../assets/images/PasswordIcon.png');
const eyeIcon = require('../../assets/images/eye.png');
const eyeOffIcon = require('../../assets/images/eyeOff.png');

const LoginPage = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  
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
      if (userData.password !== password) {
        Toast.show({ type: 'custom_error', text1: 'Hata', text2: 'Şifre yanlış.' });
        setIsLoading(false);
        return;
      }
      const userId = userDoc.id;
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

  const toastConfig = {
    custom_error: ({ text1, text2 }) => (
      <View style={toastStyles(colors).container}>
        <Image source={warningIcon} style={toastStyles(colors).icon} />
        <View style={toastStyles(colors).textContainer}>
          <Text style={toastStyles(colors).text1}>{text1}</Text>
          <Text style={toastStyles(colors).text2}>{text2}</Text>
        </View>
      </View>
    )
  };

  if (isPageLoading) return <LoginSkeleton />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.topSection}>
            <View style={styles.imageContainer}>
              {[animValue1, animValue2, animValue3, animValue4].map((anim, i) => (
                <Animated.View key={i} style={[styles.circleImageWrapper, getImageStyle(anim, i), { zIndex: zIndices[i] }]}>
                  <Image source={[image1, image2, image3, image4][i]} style={styles.circleImage} />
                </Animated.View>
              ))}
            </View>
            <Text style={styles.brandName}>
              Leapit <Text style={styles.brandTagline}>Her şey{"\n"}Daha Kolay</Text>
            </Text>
          </View>

          <View style={[styles.loginCard, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 20 : 30 }]}>
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
      </KeyboardAvoidingView>
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between' },
  topSection: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  imageContainer: { position: 'relative', height: 150, width: '100%', marginTop: 50 },
  circleImageWrapper: { position: 'absolute', borderRadius: 100, overflow: 'hidden' },
  circleImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  brandName: { color: colors.primary, fontSize: 25, fontWeight: 'bold', marginTop: 140, textAlign: 'center' },
  brandTagline: { color: colors.textMain, fontSize: 22, fontWeight: 'bold' },
  loginCard: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, zIndex: 10, elevation: 10, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  cardHeader: { alignItems: 'center', marginBottom: 20, gap: 5 },
  cardHeaderText: { color: colors.textSub, fontSize: 15 },
  cardHeaderLink: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.border, borderWidth: 1, borderColor: colors.border, borderRadius: 12, height: 50, paddingHorizontal: 15, marginBottom: 15 },
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

const toastStyles = (colors) => StyleSheet.create({
  container: { padding: 15, backgroundColor: colors.cardBackground, borderRadius: 10, flexDirection: 'row', alignItems: 'center', width: '90%', elevation: 5, alignSelf: 'center', borderWidth: 1, borderColor: colors.border },
  icon: { width: 25, height: 25, tintColor: '#FF6347', marginRight: 10 },
  textContainer: { flex: 1 },
  text1: { color: colors.textMain, fontSize: 15, fontWeight: 'bold' },
  text2: { color: colors.textSub, fontSize: 13 },
});

export default LoginPage;