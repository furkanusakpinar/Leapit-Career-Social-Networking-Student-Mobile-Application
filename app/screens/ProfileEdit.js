import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
    ToastAndroid,
    View
} from 'react-native';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';
import { uploadToCloudinary } from '../utils/cloudinary';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileEdit() {
    const userId = useSelector(state => state.user.userId);
    const themeMode = useSelector(state => state.theme?.mode || 'dark');
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);

    const [bio, setBio] = useState('');
    const [userLocation, setUserLocation] = useState('');
    const [cvUrl, setCvUrl] = useState('');
    const [profileImageUri, setProfileImageUri] = useState(null);
    const [backProfileImageUri, setBackProfileImageUri] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const navigation = useNavigation();

    const canSaveProfile = bio.trim() !== '' && userLocation.trim() !== '' && !isLoading;

    useEffect(() => {
        const fetchCurrentUser = async () => {
            if (!userId) {
                if (Platform.OS === 'android') {
                    ToastAndroid.show("Kullanıcı bilgileri çekilemedi. Lütfen tekrar giriş yapın.", ToastAndroid.LONG);
                }
                return;
            }
            setIsLoading(true);
            try {
                const userDocRef = doc(db, 'Users', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.bio) {
                        setBio(userData.bio);
                    }
                    if (userData.userLocation) {
                        setUserLocation(userData.userLocation);
                    }
                    if (userData.profileImageUrl) {
                        setProfileImageUri(userData.profileImageUrl);
                    }
                    if (userData.backProfileImageUrl) {
                        setBackProfileImageUri(userData.backProfileImageUrl);
                    }
                    if (userData.cvUrl) {
                        setCvUrl(userData.cvUrl);
                    }
                } else {
                    if (Platform.OS === 'android') {
                        ToastAndroid.show("Profiliniz bulunamadı.", ToastAndroid.LONG);
                    }
                }
            } catch (error) {
                console.error("Error fetching current user data:", error);
                if (Platform.OS === 'android') {
                    ToastAndroid.show("Profil bilgileri çekilirken hata oluştu.", ToastAndroid.LONG);
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchCurrentUser();
    }, [userId]);

    const handleChoosePhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            if (Platform.OS === 'android') {
                ToastAndroid.show("Galeriye erişim izni verilmedi.", ToastAndroid.LONG);
            }
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
            if (Platform.OS === 'android') {
                ToastAndroid.show("Galeriye erişim izni verilmedi.", ToastAndroid.LONG);
            }
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

    const uploadImageAndSaveProfile = async () => {
        if (!userId) {
            if (Platform.OS === 'android') {
                ToastAndroid.show('Hata: Kullanıcı kimliği bulunamadı.', ToastAndroid.LONG);
            }
            return;
        }
        if (!bio.trim()) {
            if (Platform.OS === 'android') {
                ToastAndroid.show('Hata: Lütfen "Hakkımda" bölümünü doldurun.', ToastAndroid.LONG);
            }
            return;
        }
        if (!userLocation.trim()) {
            if (Platform.OS === 'android') {
                ToastAndroid.show('Hata: Lütfen konum bilginizi doldurun.', ToastAndroid.LONG);
            }
            return;
        }

        setIsLoading(true);
        let imageUrlForFirebase = profileImageUri;
        let backImageUrlForFirebase = backProfileImageUri; 

        try {
            const hasNewProfileImage = profileImageUri && !profileImageUri.startsWith('http');
            const hasNewBackProfileImage = backProfileImageUri && !backProfileImageUri.startsWith('http');

            if (hasNewProfileImage) {
                try {
                    imageUrlForFirebase = await uploadToCloudinary(profileImageUri, 'image');
                } catch (err) {
                    if (Platform.OS === 'android') {
                        ToastAndroid.show('Profil resmi yüklenirken hata oluştu: ' + err.message, ToastAndroid.LONG);
                    }
                    setIsLoading(false);
                    return;
                }
            }

            if (hasNewBackProfileImage) {
                try {
                    backImageUrlForFirebase = await uploadToCloudinary(backProfileImageUri, 'image');
                } catch (err) {
                    if (Platform.OS === 'android') {
                        ToastAndroid.show('Arka plan resmi yüklenirken hata oluştu: ' + err.message, ToastAndroid.LONG);
                    }
                    setIsLoading(false);
                    return;
                }
            }

            const updateData = {
                bio: bio.trim(),
                userLocation: userLocation.trim(),
                cvUrl: cvUrl.trim(),
                profileImageUrl: imageUrlForFirebase,
                backProfileImageUrl: backImageUrlForFirebase, 
            };
            await updateDoc(doc(db, 'Users', userId), updateData);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Profiliniz başarıyla güncellendi!', ToastAndroid.LONG);
            }
            navigation.goBack();

        } catch (e) {
            console.error('Profil veya resim güncellenemedi:', e);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Hata: Profil kaydedilirken bir sorun oluştu.', ToastAndroid.LONG);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Sabit Üst Başlık ve Geri Butonu */}
            <View style={styles.headerFixed}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButtonHeader}>
                    <Ionicons name="arrow-back" size={24} color={colors.textMain} />
                </Pressable>
                <Text style={styles.brandTagline}>Profili Düzenle</Text>
                <View style={{ width: 24 }} />
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
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.loginCard}>
                        {/* Kapak Fotoğrafı */}
                        <View style={styles.bannerContainer}>
                            <Pressable onPress={handleChooseBackPhoto} style={styles.bannerPressable}>
                                {backProfileImageUri ? (
                                    <Image source={{ uri: backProfileImageUri }} style={styles.bannerImage} />
                                ) : (
                                    <View style={styles.bannerPlaceholder}>
                                        <Ionicons name="image" size={30} color={colors.textSub} />
                                        <Text style={styles.bannerPlaceholderText}>Kapak Fotoğrafı Ekle</Text>
                                    </View>
                                )}
                                <View style={styles.bannerCameraIcon}>
                                    <Ionicons name="camera" size={18} color="white" />
                                </View>
                            </Pressable>
                        </View>

                        {/* Profil Fotoğrafı */}
                        <View style={styles.profileImageWrapper}>
                            <Pressable onPress={handleChoosePhoto} style={styles.imagePressable}>
                                {profileImageUri ? (
                                    <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
                                ) : (
                                    <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border }]}>
                                        <MaterialCommunityIcons name="account-circle" size={92} color={colors.textSub} />
                                    </View>
                                )}
                                <View style={styles.cameraIconBadge}>
                                    <Ionicons name="camera" size={16} color="white" />
                                </View>
                            </Pressable>
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
                        <Text style={styles.charCount}>{bio.length}/500</Text>

                        <Text style={styles.titleText}>Konum *</Text>
                        <TextInput
                            placeholder="Şehir, Ülke"
                            placeholderTextColor={colors.textSub}
                            style={[styles.input, styles.locationInput]}
                            value={userLocation}
                            onChangeText={setUserLocation}
                            maxLength={100}
                        />
                        <Text style={styles.charCount}>{userLocation.length}/100</Text>

                        <Text style={styles.titleText}>CV Bağlantısı (URL)</Text>
                        <TextInput
                            placeholder="CV / Portfolyo linkinizi girin (örn. Drive, PDF, web sitesi)..."
                            placeholderTextColor={colors.textSub}
                            style={[styles.input, styles.locationInput]}
                            value={cvUrl}
                            onChangeText={setCvUrl}
                            maxLength={200}
                        />
                        <Text style={styles.charCount}>{cvUrl.length}/200</Text>

                        <Pressable
                            style={[styles.button, !canSaveProfile && styles.disabledButton]}
                            onPress={uploadImageAndSaveProfile}
                            disabled={!canSaveProfile}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={styles.buttonText}>Kaydet</Text>
                            )}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        zIndex: 100
    },
    backButtonHeader: { padding: 4 },
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

    titleText: { color: colors.textSub, marginBottom: 4, fontSize: 12, fontWeight: '600', marginTop: 12 },
    input: { backgroundColor: '#13151C', borderRadius: 10, padding: 10, color: colors.textMain, fontSize: 14, marginBottom: 4 },
    bioInput: { height: 80, textAlignVertical: 'top' },
    locationInput: { height: 50 },
    charCount: {
        color: colors.textSub,
        fontSize: 11,
        textAlign: 'right',
        marginBottom: 8,
    },
    button: { backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 15, marginBottom: 20 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    disabledButton: { opacity: 0.5 },
});