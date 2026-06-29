import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated,
    Dimensions,
    Easing,
    Image,
    KeyboardAvoidingView, Modal, Platform,
    Pressable,
    StyleSheet,
    Text, TextInput,
    View
} from 'react-native';
import { hashPassword } from '../utils/hash';

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');
const SCREEN_WIDTH = WIN_W;

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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { setUserId, setProfileStep } from '../redux/userSlice';
import SignupSkeleton from '../skeleton/SignupSkeleton';
import { lightTheme, darkTheme } from '../theme/colors';

const { width: SCREEN_WIDTH_UNUSED } = Dimensions.get('window');

const SignupPage = () => {
    const insets = useSafeAreaInsets();
    const themeMode = useSelector(state => state.theme?.mode || 'dark');
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const navigation = useNavigation();
    const dispatch = useDispatch();

    // BottomSheet state
    const [sheetVisible, setSheetVisible] = useState(false);
    const [pendingResume, setPendingResume] = useState(null); // { docId, step, existingDocId }
    const sheetAnim = useRef(new Animated.Value(300)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const openSheet = (data) => {
        setPendingResume(data);
        setSheetVisible(true);
        Animated.parallel([
            Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    };

    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(sheetAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => { setSheetVisible(false); setPendingResume(null); });
    };

    const handleResumeYes = async () => {
        if (!pendingResume) return;
        closeSheet();
        dispatch(setUserId(pendingResume.docId));
        dispatch(setProfileStep(pendingResume.step));
        await AsyncStorage.removeItem('signup_attempt');
        navigation.replace(pendingResume.step);
    };

    const handleResumeNo = async () => {
        if (!pendingResume) return;
        closeSheet();
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'Users', pendingResume.docId));
            await AsyncStorage.multiRemove(['create_profile_draft', 'create_page2_draft', 'student_page_draft', 'step1_completed']);
            const usersRef = collection(db, 'Users');
            const hashedPassword = hashPassword(password);
            const docRef = await addDoc(usersRef, {
                fullName, email, password: hashedPassword, createdAt: new Date().toISOString()
            });
            dispatch(setUserId(docRef.id));
            await AsyncStorage.removeItem('signup_attempt');
            navigation.replace('CreateProfile');
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Hata', text2: 'İşlem tamamlanamadı.' });
        } finally {
            setIsLoading(false);
        }
    };

    const animValue1 = useRef(new Animated.Value(0)).current;
    const animValue2 = useRef(new Animated.Value(0)).current;
    const animValue3 = useRef(new Animated.Value(0)).current;
    const animValue4 = useRef(new Animated.Value(0)).current;
    const [zIndices, setZIndices] = useState([4, 3, 2, 1]);

    
    useEffect(() => {
        let isMounted = true;

        const prepareAuthPage = async () => {
            try {
                // Son 20 dk içinde kayıt denemesi yapıldıysa e-postayı geri yükle
                const saved = await AsyncStorage.getItem('signup_attempt');
                if (saved) {
                    const { email: savedEmail, timestamp } = JSON.parse(saved);
                    const diffMs = Date.now() - timestamp;
                    if (diffMs < 20 * 60 * 1000) {
                        if (isMounted) setEmail(savedEmail);
                    } else {
                        await AsyncStorage.removeItem('signup_attempt');
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1200));

                if (isMounted) {
                    setPageLoading(false);
                }
            } catch (error) {
                console.error("Sayfa hazırlık hatası:", error);
            }
        };

        prepareAuthPage();
        return () => { isMounted = false; };
    }, []);

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

        const bind = (v, index) => v.addListener(({ value }) => {
            const newZ = 4 - Math.round(value % 4);
            setZIndices(prev => {
                const next = [...prev];
                next[index] = newZ;
                return next;
            });
        });

        [animValue1, animValue2, animValue3, animValue4].forEach((v, i) => bind(v, i));
        animateLoop();

        return () => {
            clearTimeout(loopTimeout);
            [animValue1, animValue2, animValue3, animValue4].forEach(v => v.removeAllListeners());
        };
    }, []);

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

    const handleRegister = async () => {
        if (isLoading) return;
        if (!fullName.trim() || !email.includes('@') || password.length < 8) {
            Toast.show({ type: 'error', text1: 'Hata', text2: 'Bilgileri kontrol edin.' });
            return;
        }
        setIsLoading(true);
        try {
            await AsyncStorage.setItem('signup_attempt', JSON.stringify({ email, timestamp: Date.now() }));
        } catch (_) {}
        try {
            const usersRef = collection(db, 'Users');
            const q = query(usersRef, where('email', '==', email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const existingDoc = snapshot.docs[0];
                const existingData = existingDoc.data();

                if (existingData.profileCompleted) {
                    Toast.show({ type: 'error', text1: 'Hata', text2: 'Bu e-posta adresi zaten kullanılıyor.' });
                    setIsLoading(false);
                    return;
                }

                const createdAt = existingData.createdAt ? new Date(existingData.createdAt).getTime() : 0;
                const elapsedMs = Date.now() - createdAt;
                const TWENTY_MINUTES = 20 * 60 * 1000;

                if (elapsedMs <= TWENTY_MINUTES) {
                    // 20 dk içinde — BottomSheet sor
                    let step = 'CreateProfile';
                    try {
                        const step1Raw = await AsyncStorage.getItem('step1_completed');
                        if (step1Raw) {
                            const parsed = JSON.parse(step1Raw);
                            if (Date.now() - parsed.timestamp < TWENTY_MINUTES) {
                                step = 'CreatePage2';
                            }
                        }
                    } catch (_) {}
                    setIsLoading(false);
                    openSheet({ docId: existingDoc.id, step });
                    return;
                } else {
                    // 20 dk geçmiş — sil ve yeniden kayıt et
                    await deleteDoc(doc(db, 'Users', existingDoc.id));
                    await AsyncStorage.multiRemove(['create_profile_draft', 'create_page2_draft', 'student_page_draft', 'step1_completed']);
                }
            }

            const hashedPassword = hashPassword(password);
            const docRef = await addDoc(usersRef, {
                fullName, email, password: hashedPassword, createdAt: new Date().toISOString()
            });
            dispatch(setUserId(docRef.id));
            await AsyncStorage.removeItem('signup_attempt');
            navigation.replace('CreateProfile');
        } catch (error) {
            setIsLoading(false);
            Toast.show({ type: 'error', text1: 'Sistem Hatası', text2: 'Kayıt işlemi yapılamadı.' });
        }
    };

    if (pageLoading) return <SignupSkeleton />;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ParticleBackground color={themeMode === 'dark' ? 'rgba(100,149,237,0.45)' : 'rgba(80,80,180,0.35)'} />
            <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.content}>
                    <View style={styles.topSection}>
                        <View style={styles.imageContainer}>
                            {[animValue1, animValue2, animValue3, animValue4].map((anim, i) => (
                                <Animated.View
                                    key={i}
                                    style={[styles.circleImageWrapper, getImageStyle(anim, i), { zIndex: zIndices[i] }]}
                                >
                                    <Image source={[
                                        require('../../assets/images/AIPhoto1.png'),
                                        require('../../assets/images/AIPhoto4.png'),
                                        require('../../assets/images/AIPhoto3.png'),
                                        require('../../assets/images/AIPhoto2.png')
                                    ][i]} style={styles.circleImage} />
                                </Animated.View>
                            ))}
                        </View>
                        <Text style={styles.brandName}>
                            Leapit <Text style={styles.brandTagline}>Her şey{"\n"}Daha Kolay</Text>
                        </Text>
                    </View>

                    <View style={[
                        styles.loginCard,
                        { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 20 : 30 }
                    ]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardHeaderText}>Zaten Leapit üyesi misiniz?</Text>
                            <Pressable onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.cardHeaderLink}>Giriş Yap</Text>
                            </Pressable>
                        </View>

                        <View style={styles.inputContainer}>
                            <Image source={require('../../assets/images/user.png')} style={[styles.userIcon, { tintColor: colors.iconTint }]} />
                            <TextInput style={styles.input} placeholder="Tam Adınız" placeholderTextColor={colors.textSub} value={fullName} onChangeText={setFullName} />
                        </View>

                        <View style={styles.inputContainer}>
                            <Image source={require('../../assets/images/emailIcon.png')} style={[styles.inputIcon, { tintColor: colors.iconTint }]} />
                            <TextInput style={styles.input} placeholder="E-posta" placeholderTextColor={colors.textSub} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        </View>

                        <View style={styles.inputContainer}>
                            <Image source={require('../../assets/images/PasswordIcon.png')} style={[styles.inputIcon, { tintColor: colors.iconTint }]} />
                            <TextInput style={styles.input} placeholder="Şifre" placeholderTextColor={colors.textSub} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                            <Pressable onPress={() => setShowPassword(!showPassword)}>
                                <Image source={showPassword ? require('../../assets/images/eyeOff.png') : require('../../assets/images/eye.png')} style={[showPassword ? styles.hidePasswordIcon : styles.showPasswordIcon, { tintColor: colors.iconTint }]} />
                            </Pressable>
                        </View>

                        <Pressable style={styles.button} onPress={handleRegister} disabled={isLoading}>
                            {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Kayıt Ol</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>


            {/* BottomSheet Modal */}
            <Modal transparent visible={sheetVisible} animationType="none" onRequestClose={closeSheet}>
                <Animated.View style={[bsStyles.backdrop, { opacity: backdropAnim }]}>
                    <Pressable style={{ flex: 1 }} onPress={closeSheet} />
                </Animated.View>
                <Animated.View style={[bsStyles.sheet, { backgroundColor: colors.cardBackground, borderColor: colors.border, transform: [{ translateY: sheetAnim }] }]}>
                    <View style={bsStyles.handle} />
                    <View style={[bsStyles.iconCircle, { backgroundColor: colors.primary + '22' }]}>
                        <Text style={{ fontSize: 32 }}>⏱️</Text>
                    </View>
                    <Text style={[bsStyles.title, { color: colors.textMain }]}>Kaldığın Yerden Devam Et</Text>
                    <Text style={[bsStyles.subtitle, { color: colors.textSub }]}>
                        Bu e-posta ile yakın zamanda yarım bırakılmış{`\n`}bir kayıt bulundu. Devam etmek ister misin?
                    </Text>
                    <Pressable style={[bsStyles.btnYes, { backgroundColor: colors.primary }]} onPress={handleResumeYes}>
                        <Text style={bsStyles.btnYesText}>Evet, Devam Et</Text>
                    </Pressable>
                    <Pressable style={[bsStyles.btnNo, { borderColor: colors.border }]} onPress={handleResumeNo}>
                        <Text style={[bsStyles.btnNoText, { color: colors.textSub }]}>Hayır, Baştan Başla</Text>
                    </Pressable>
                </Animated.View>
            </Modal>
        </SafeAreaView>
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'space-between' },
    topSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1
    },
    imageContainer: { position: 'relative', height: 150, width: '100%', marginTop: 50 },
    circleImageWrapper: { position: 'absolute', borderRadius: 100, overflow: 'hidden' },
    circleImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    brandName: { color: colors.primary, fontSize: 28, fontWeight: 'bold', marginTop: 150, textAlign: 'center' },
    brandTagline: { color: colors.textMain, fontSize: 26, fontWeight: 'bold' },
    loginCard: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        zIndex: 10,
        elevation: 10,
        width: '100%',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: { alignItems: 'center', marginBottom: 20, gap: 8 },
    cardHeaderText: { fontSize: 15, color: colors.textSub },
    cardHeaderLink: { fontSize: 16, color: colors.primary, fontWeight: 'bold' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.border,
        borderWidth: 1, borderColor: colors.border, borderRadius: 12, height: 50, paddingHorizontal: 15, marginBottom: 15
    },
    inputIcon: { width: 24, height: 24, marginRight: 10 },
    userIcon: { width: 20, height: 22, marginRight: 10, marginLeft: 2 },
    input: { flex: 1, color: colors.textMain, fontSize: 16 },
    showPasswordIcon: { width: 24, height: 24 },
    hidePasswordIcon: { width: 20, height: 20 },
    button: { marginTop: 10, height: 55, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

const bsStyles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingBottom: 36,
        paddingTop: 12,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        alignItems: 'center',
        elevation: 20,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(150,150,150,0.4)',
        marginBottom: 20,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    btnYes: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
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
    },
    btnNoText: {
        fontWeight: '600',
        fontSize: 15,
    },
});

export default SignupPage;