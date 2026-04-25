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
    PixelRatio,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text, TextInput,
    ToastAndroid,
    View
} from 'react-native';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const responsiveFontSize = (size) => {
    const standardScreenHeight = 680;
    const heightPercentage = (size / standardScreenHeight) * 100;
    const percentage = (heightPercentage * SCREEN_WIDTH) / 100;

    const scalingFactor = 1.35;
    return Math.round((percentage / PixelRatio.getFontScale()) * scalingFactor);
};


const BACKEND_URL = 'http://141.11.109.234:3002';
const PROFILE_IMAGE_UPLOAD_URL = 'https://jobscheck.com.tr/upload_profile_image.php';

export default function ProfileEdit() {
    const userId = useSelector(state => state.user.userId);
    const themeMode = useSelector(state => state.theme?.mode || 'dark');
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);

    const [currentUserData, setCurrentUserData] = useState(null);

    const [bio, setBio] = useState('');
    const [userLocation, setUserLocation] = useState('');
    const [profileImageUri, setProfileImageUri] = useState(null);
    const [backProfileImageUri, setBackProfileImageUri] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingConnection, setIsSendingConnection] = useState(false);
    const [connectedUserIds, setConnectedUserIds] = useState(new Set());
    const [connectionCount, setConnectionCount] = useState(0);
    const MAX_CONNECTIONS = 10;

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
                    setCurrentUserData(userData);
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
                } else {
                    if (Platform.OS === 'android') {
                        ToastAndroid.show("Profiliniz bulunamadı. Yeni bir profil oluşturun.", ToastAndroid.LONG);
                    }
                }
            } catch (error) {
                console.error("Error fetching current user data:", error);
                if (Platform.OS === 'android') {
                    ToastAndroid.show("Profil bilgi çekilirken hata oluştu.", ToastAndroid.LONG);
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
            aspect: [5, 3], 
            quality: 0.7,
        });

        if (!result.canceled) {
            setBackProfileImageUri(result.assets[0].uri); 
        }
    };

    const uploadImageAndSaveProfile = async () => {
        if (!userId) {
            if (Platform.OS === 'android') {
                ToastAndroid.show('Hata: Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.', ToastAndroid.LONG);
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
            const formData = new FormData();
            let hasNewProfileImage = false;
            let hasNewBackProfileImage = false;

            
            if (profileImageUri && profileImageUri.startsWith('file://')) {
                formData.append('profileImage', {
                    uri: profileImageUri,
                    name: `profile_${userId}_${new Date().getTime()}.jpg`,
                    type: 'image/jpeg',
                });
                hasNewProfileImage = true;
            }

            
            if (backProfileImageUri && backProfileImageUri.startsWith('file://')) {
                formData.append('backProfileImage', {
                    uri: backProfileImageUri,
                    name: `back_profile_${userId}_${new Date().getTime()}.jpg`,
                    type: 'image/jpeg',
                });
                hasNewBackProfileImage = true;
            }

            if (hasNewProfileImage || hasNewBackProfileImage) {
                const uploadResponse = await axios.post(PROFILE_IMAGE_UPLOAD_URL, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                if (uploadResponse.data.success) {
                    if (uploadResponse.data.profileImageUrl) {
                        imageUrlForFirebase = uploadResponse.data.profileImageUrl;
                    }
                    if (uploadResponse.data.backProfileImageUrl) { 
                        backImageUrlForFirebase = uploadResponse.data.backProfileImageUrl;
                    }
                    if (Platform.OS === 'android') {
                        ToastAndroid.show('Resimler başarıyla yüklendi!', ToastAndroid.SHORT);
                    }
                } else {
                    if (Platform.OS === 'android') {
                        ToastAndroid.show('Resim yüklenirken hata oluştu: ' + uploadResponse.data.message, ToastAndroid.LONG);
                    }
                    setIsLoading(false);
                    return;
                }
            }


            const updateData = {
                bio: bio.trim(),
                userLocation: userLocation.trim(),
                profileImageUrl: imageUrlForFirebase,
                backProfileImageUrl: backImageUrlForFirebase, 
            };
            await updateDoc(doc(db, 'Users', userId), updateData);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Profiliniz başarıyla güncellendi!', ToastAndroid.LONG);
            }
            navigation.navigate('MainSwipe', { screen: 'HomePage' });

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
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                style={styles.scrollViewContent}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Profilini Tamamla</Text>

                {}
                <Pressable onPress={handleChooseBackPhoto} style={styles.backProfileImageContainer}>
                    {backProfileImageUri ? (
                        <Image source={{ uri: backProfileImageUri }} style={styles.backProfileImage} />
                    ) : (
                        <View style={styles.backProfileImagePlaceholder}>
                            <Text style={styles.placeholderText}>Arka Plan</Text>
                            <Text style={styles.placeholderSubText}>Fotoğrafı Seç</Text>
                        </View>
                    )}
                </Pressable>

                <Pressable onPress={handleChoosePhoto} style={styles.profileImageContainer}>
                    {profileImageUri ? (
                        <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.profileImagePlaceholder}>
                            <Text style={styles.placeholderText}>Profil</Text>
                            <Text style={styles.placeholderSubText}>Seç</Text>
                        </View>
                    )}
                    <Text style={styles.changeBackPhotoText}>Profil Fotoğrafı Seç / Değiştir</Text>
                </Pressable>

                <Text style={styles.label}>Hakkımda</Text>
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

                <Text style={styles.label}>Konum *</Text>
                <TextInput
                    placeholder="Konumunuzu girin..."
                    placeholderTextColor={colors.textSub}
                    style={[styles.input, styles.locationInput]}
                    multiline
                    value={userLocation}
                    onChangeText={setUserLocation}
                    maxLength={100}
                />
                <Text style={styles.charCount}>{userLocation.length}/100</Text>

                <Pressable
                    style={[styles.button, !canSaveProfile && styles.disabledButton]}
                    onPress={uploadImageAndSaveProfile}
                    disabled={!canSaveProfile}
                >
                    {isLoading && !isSendingConnection ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={[styles.buttonText, !canSaveProfile && styles.disabledButtonText]}>İleri</Text>
                    )}
                </Pressable>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollViewContent: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        paddingBottom: SCREEN_HEIGHT * 0.02,
        paddingHorizontal: SCREEN_WIDTH * 0.03,
        paddingTop: SCREEN_HEIGHT * 0.07,
    },
    title: {
        color: colors.textMain,
        fontSize: responsiveFontSize(32),
        marginBottom: SCREEN_HEIGHT * 0.02,
        textAlign: 'center',
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    label: {
        color: colors.textSub,
        fontSize: responsiveFontSize(18),
        marginTop: SCREEN_HEIGHT * 0.02,
        fontWeight: '500',
    },
    input: {
        backgroundColor: colors.cardBackground,
        color: colors.textMain,
        padding: SCREEN_WIDTH * 0.035,
        borderRadius: 10,
        fontSize: responsiveFontSize(17),
        borderWidth: 1,
        borderColor: colors.border,
    },
    bioInput: {
        height: SCREEN_HEIGHT * 0.13,
        textAlignVertical: 'top',
        lineHeight: responsiveFontSize(22),
        marginBottom: SCREEN_HEIGHT * 0.002,
    },
    locationInput: {
        height: SCREEN_HEIGHT * 0.065,
        textAlignVertical: 'top',
        lineHeight: responsiveFontSize(22),
    },
    charCount: {
        color: colors.textSub,
        fontSize: responsiveFontSize(13),
        textAlign: 'right',
        marginTop: SCREEN_HEIGHT * 0.002,
        marginBottom: SCREEN_HEIGHT * 0.002,
    },
    
    backProfileImageContainer: {
        alignItems: 'center',
        marginTop: SCREEN_HEIGHT * 0.02,
        marginBottom: SCREEN_HEIGHT * 0.03,
        width: '100%',
        position: 'relative',
    },
    backProfileImage: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.2, 
        borderRadius: 10,
        backgroundColor: colors.border,
        resizeMode: 'cover',
    },
    backProfileImagePlaceholder: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.2,
        borderRadius: 10,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    changeBackPhotoText: {
        color: colors.primary,
        fontSize: responsiveFontSize(16),
        marginTop: SCREEN_HEIGHT * 0.01,
        fontWeight: 'bold',
    },
    
    profileImageContainer: {
        alignItems: 'center',
        marginTop: -SCREEN_HEIGHT * 0.12, 
        marginBottom: SCREEN_HEIGHT * 0.03,
        zIndex: 10,
    },
    profileImage: {
        width: SCREEN_WIDTH * 0.3,
        height: SCREEN_WIDTH * 0.3,
        borderRadius: (SCREEN_WIDTH * 0.3) / 2,
        justifyContent: 'center',
        alignItems: 'center',
        resizeMode: 'cover',
        borderWidth: 3,
        borderColor: colors.background,
    },
    profileImagePlaceholder: {
        width: SCREEN_WIDTH * 0.3,
        height: SCREEN_WIDTH * 0.3,
        borderRadius: (SCREEN_WIDTH * 0.3) / 2,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    placeholderText: {
        color: colors.textSub,
        fontSize: responsiveFontSize(18),
        fontWeight: 'bold',
    },
    placeholderSubText: {
        color: colors.textSub,
        fontSize: responsiveFontSize(14),
    },
    button: {
        backgroundColor: colors.primary,
        padding: SCREEN_HEIGHT * 0.018,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: SCREEN_HEIGHT * 0.025,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: responsiveFontSize(18),
        letterSpacing: 0.3,
    },
    disabledButton: {
        backgroundColor: colors.border,
        borderColor: colors.textSub,
        elevation: 0,
    },
    disabledButtonText: {
        color: colors.textSub,
    },
    skipButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary,
        padding: SCREEN_HEIGHT * 0.018,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: SCREEN_HEIGHT * 0.015,
    },
    skipButtonText: {
        color: colors.primary,
        fontSize: responsiveFontSize(18),
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
});