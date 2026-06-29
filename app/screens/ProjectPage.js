import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';
import { uploadToCloudinary } from '../utils/cloudinary';

const MAX_PHOTOS = 5;

const getToastConfig = (colors) => ({
    success: (props) => (
        <BaseToast
            {...props}
            style={{ borderLeftColor: '#69B958', backgroundColor: colors.cardBackground, height: 60, borderRadius: 10, width: '90%' }}
            text1Style={{ fontSize: 15, fontWeight: 'bold', color: colors.textMain }}
            text2Style={{ fontSize: 13, color: colors.textSub }}
        />
    ),
    error: (props) => (
        <ErrorToast
            {...props}
            style={{ borderLeftColor: '#E63946', backgroundColor: colors.cardBackground, height: 60, borderRadius: 10, width: '90%' }}
            text1Style={{ fontSize: 15, fontWeight: 'bold', color: colors.textMain }}
            text2Style={{ fontSize: 13, color: colors.textSub }}
        />
    ),
});

export function ProjectPage() {
    const userId = useSelector((state) => state.user.userId);
    const themeMode = useSelector(state => state.theme?.mode || 'light');
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);
    const toastConfig = getToastConfig(colors);

    const [userData, setUserData] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const [projectTitle, setProjectTitle] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [readmeContent, setReadmeContent] = useState('');
    const [codeSnippet, setCodeSnippet] = useState('');

    // Fotoğraflar
    const [photos, setPhotos] = useState([]); // [{ uri, name }]

    const navigation = useNavigation();
    const route = useRoute();

    const [postVisibility, setPostVisibility] = useState('global');
    const { prePostId } = route.params || {};

    useEffect(() => {
        if (!userId) { setUserData(null); return; }
        const unsub = onSnapshot(doc(db, 'Users', userId), (docSnap) => {
            setUserData(docSnap.exists() ? docSnap.data() : null);
        });
        return () => unsub();
    }, [userId]);

    useEffect(() => {
        if (!prePostId) return;
        const unsub = onSnapshot(doc(db, 'prePosts', prePostId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPostVisibility(data.visibility || 'global');
            }
        });
        return () => unsub();
    }, [prePostId]);

    // ── Fotoğraf Seç ────────────────────────────────────────────────────────
    const handlePickPhotos = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni vermeniz gerekiyor.');
                return;
            }

            const remaining = MAX_PHOTOS - photos.length;
            if (remaining <= 0) {
                Toast.show({ type: 'error', text1: 'Uyarı', text2: `En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz.` });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: remaining,
                quality: 0.85,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const newPhotos = result.assets.map((asset, i) => ({
                    uri: asset.uri,
                    name: `project_${userId}_${Date.now()}_${i}.jpg`,
                }));
                setPhotos(prev => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
            }
        } catch (err) {
            Alert.alert('Hata', 'Fotoğraf seçilirken sorun oluştu: ' + err.message);
        }
    };

    const handleRemovePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // ── Fotoğraf Upload ─────────────────────────────────────────────────────
    const uploadPhotos = async () => {
        const urls = [];
        for (let i = 0; i < photos.length; i++) {
            setUploadProgress(`Fotoğraf yükleniyor ${i + 1}/${photos.length}...`);
            const photo = photos[i];
            try {
                const url = await uploadToCloudinary(photo.uri, 'image');
                if (url) {
                    urls.push(url);
                } else {
                    throw new Error(`Fotoğraf ${i + 1} yüklenemedi: URL boş döndü`);
                }
            } catch (err) {
                throw new Error(`Fotoğraf ${i + 1} yüklenemedi: ${err.message}`);
            }
        }
        setUploadProgress('');
        return urls;
    };

    // ── Gönder ──────────────────────────────────────────────────────────────
    const handleGonder = async () => {
        if (!projectTitle.trim() && !readmeContent.trim()) {
            Toast.show({ type: 'error', text1: 'Uyarı', text2: 'Lütfen başlık ve açıklama giriniz.' });
            return;
        }
        setUploading(true);

        try {
            // Önce fotoğrafları yükle
            let photoUrls = [];
            if (photos.length > 0) {
                photoUrls = await uploadPhotos();
            }

            const userProjectsRef = collection(db, 'Users', userId, 'projects');
            await addDoc(userProjectsRef, {
                userId,
                userName: userData?.fullName || 'İsimsiz',
                title: projectTitle.trim(),
                githubUrl: githubUrl.trim(),
                readme: readmeContent.trim(),
                codeSnippet: codeSnippet.trim(),
                photos: photoUrls,
                shareSetting: postVisibility,
                createdAt: serverTimestamp(),
            });

            if (prePostId) {
                await deleteDoc(doc(db, 'prePosts', prePostId));
            }

            Toast.show({ type: 'success', text1: 'Başarılı', text2: 'Proje paylaşıldı!' });

            setTimeout(() => {
                if (navigation.canGoBack()) navigation.popToTop();
            }, 500);

        } catch (error) {
            Toast.show({ type: 'error', text1: 'Hata', text2: error.message });
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={16}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={() => navigation.goBack()} hitSlop={15}>
                            <Image source={require('../../assets/images/back.png')} style={[styles.iconBack, { tintColor: colors.iconTint }]} />
                        </Pressable>
                        <View>
                            <Text style={styles.headerTitle}>Yeni Proje</Text>
                            {!!uploadProgress && (
                                <Text style={styles.progressText}>{uploadProgress}</Text>
                            )}
                        </View>
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

                    {/* Profil Satırı */}
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
                            <Pressable onPress={() => navigation.navigate('BlogPublicPage', { prePostId })} style={styles.badge}>
                                <Image source={require('../../assets/images/GlobalGray.png')} style={[styles.badgeIcon, { tintColor: colors.textSub }]} />
                                <Text style={styles.badgeText}>Görünürlük Ayarları</Text>
                                <Image source={require('../../assets/images/GlobalA.png')} style={[styles.badgeIcon, { tintColor: colors.textSub, opacity: 0.5, marginLeft: 4 }]} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Proje Başlığı */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Proje Başlığı</Text>
                        <TextInput
                            placeholder="Örn: Leapit Mobile App"
                            placeholderTextColor={colors.textSub}
                            value={projectTitle}
                            onChangeText={setProjectTitle}
                            style={[styles.textInput, { fontWeight: 'bold' }]}
                        />
                    </View>

                    {/* GitHub */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>GitHub Bağlantısı</Text>
                        <View style={styles.linkRow}>
                            <Ionicons name="logo-github" size={20} color={colors.textSub} style={{ marginRight: 8 }} />
                            <TextInput
                                placeholder="https://github.com/..."
                                placeholderTextColor={colors.textSub}
                                value={githubUrl}
                                onChangeText={setGithubUrl}
                                style={[styles.textInput, { flex: 1, paddingVertical: 0 }]}
                                autoCapitalize="none"
                                keyboardType="url"
                            />
                        </View>
                    </View>

                    {/* Fotoğraflar */}
                    <View style={styles.inputContainer}>
                        <View style={styles.photoHeader}>
                            <Text style={styles.inputLabel}>Uygulama Fotoğrafları</Text>
                            <Text style={styles.photoCount}>{photos.length}/{MAX_PHOTOS}</Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                            {/* Ekle Butonu */}
                            {photos.length < MAX_PHOTOS && (
                                <TouchableOpacity
                                    style={[styles.photoAddBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                                    onPress={handlePickPhotos}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="images-outline" size={28} color={colors.textSub} />
                                    <Text style={[styles.photoAddText, { color: colors.textSub }]}>Ekle</Text>
                                </TouchableOpacity>
                            )}

                            {/* Seçilen Fotoğraflar */}
                            {photos.map((photo, index) => (
                                <View key={index} style={styles.photoThumbWrapper}>
                                    <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                                    <TouchableOpacity
                                        style={styles.photoRemoveBtn}
                                        onPress={() => handleRemovePhoto(index)}
                                    >
                                        <Ionicons name="close-circle" size={22} color="#E63946" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        {photos.length === 0 && (
                            <Text style={[styles.photoHint, { color: colors.textSub }]}>
                                Uygulamanızın ekran görüntülerini ekleyin (en fazla {MAX_PHOTOS} adet)
                            </Text>
                        )}
                    </View>

                    {/* Readme */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Readme / Açıklama</Text>
                        <TextInput
                            placeholder="Projenizi detaylıca anlatın... (Markdown veya HTML desteklenir)"
                            placeholderTextColor={colors.textSub}
                            value={readmeContent}
                            onChangeText={setReadmeContent}
                            style={[styles.textInput, styles.textArea]}
                            multiline
                        />
                    </View>

                    {/* Kod Parçası */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Kod Parçası (Opsiyonel)</Text>
                        <TextInput
                            placeholder="Önemli bir kod bloğu ekleyin..."
                            placeholderTextColor={colors.textSub}
                            value={codeSnippet}
                            onChangeText={setCodeSnippet}
                            style={[styles.textInput, styles.codeArea]}
                            multiline
                        />
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: '5%', paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    iconBack: { width: 24, height: 24, resizeMode: 'contain' },
    headerTitle: { color: colors.textMain, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    progressText: { color: colors.primary, fontSize: 11, textAlign: 'center', marginTop: 2 },
    publishBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    iconUpload: { width: 20, height: 20, tintColor: 'white' },
    profileRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border },
    profileInfo: { marginLeft: 12 },
    userName: { color: colors.textMain, fontSize: 16, fontWeight: '600' },
    badge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    badgeIcon: { width: 12, height: 12, marginRight: 4 },
    badgeText: { color: colors.textSub, fontSize: 12 },

    inputContainer: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputLabel: {
        color: colors.textSub,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    linkRow: { flexDirection: 'row', alignItems: 'center' },
    textInput: { color: colors.textMain, fontSize: 15, paddingVertical: 4 },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    codeArea: {
        minHeight: 120,
        textAlignVertical: 'top',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        backgroundColor: colors.background,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },

    // Fotoğraf alanı
    photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    photoCount: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    photoScroll: { flexDirection: 'row' },
    photoAddBtn: {
        width: 90,
        height: 90,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    photoAddText: { fontSize: 11, marginTop: 4, fontWeight: '600' },
    photoThumbWrapper: {
        width: 90,
        height: 90,
        borderRadius: 12,
        marginRight: 10,
        position: 'relative',
        overflow: 'visible',
    },
    photoThumb: {
        width: 90,
        height: 90,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    photoRemoveBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: colors.cardBackground,
        borderRadius: 11,
    },
    photoHint: { fontSize: 12, marginTop: 8, lineHeight: 18 },
});

export default ProjectPage;
