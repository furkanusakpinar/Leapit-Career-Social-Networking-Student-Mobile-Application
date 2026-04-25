import { useNavigation } from '@react-navigation/native';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
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
import { db } from '../../firebaseConfig';
import { setUserId } from '../redux/userSlice';
import SignupSkeleton from '../skeleton/SignupSkeleton';
import { lightTheme, darkTheme } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

    const animValue1 = useRef(new Animated.Value(0)).current;
    const animValue2 = useRef(new Animated.Value(0)).current;
    const animValue3 = useRef(new Animated.Value(0)).current;
    const animValue4 = useRef(new Animated.Value(0)).current;
    const [zIndices, setZIndices] = useState([4, 3, 2, 1]);

    
    useEffect(() => {
        let isMounted = true;

        const prepareAuthPage = async () => {
            try {
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
            const usersRef = collection(db, 'Users');
            const q = query(usersRef, where('email', '==', email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                Toast.show({ type: 'error', text1: 'Hata', text2: 'E-posta kayıtlı.' });
                setIsLoading(false);
                return;
            }
            const docRef = await addDoc(usersRef, { fullName, email, password, createdAt: new Date().toISOString() });
            dispatch(setUserId(docRef.id));
            navigation.replace('CreateProfile');
        } catch (error) {
            setIsLoading(false);
            Toast.show({ type: 'error', text1: 'Sistem Hatası', text2: 'Kayıt işlemi yapılamadı.' });
        }
    };

    if (pageLoading) return <SignupSkeleton />;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
            <Toast />
        </SafeAreaView>
    );
};

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
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

export default SignupPage;