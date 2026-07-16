import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import VisibilityMenu, { VISIBILITY_OPTIONS } from '../components/VisibilityMenu';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
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
import { fetchRepoTitle } from '../utils/github';

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
    const isDark = themeMode === 'dark';
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);
    const toastConfig = getToastConfig(colors);

    const [userData, setUserData] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const [projectTitle, setProjectTitle] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [fetchingTitle, setFetchingTitle] = useState(false);

    const navigation = useNavigation();
    const route = useRoute();

    const [postVisibility, setPostVisibility] = useState('everyone');
    const [visibilityMenuVisible, setVisibilityMenuVisible] = useState(false);
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
                setPostVisibility(data.visibility || 'everyone');
            }
        });
        return () => unsub();
    }, [prePostId]);

    const handleFetchTitle = async () => {
        if (!githubUrl) {
            Toast.show({ type: 'error', text1: 'Uyarı', text2: 'Lütfen önce GitHub bağlantısını girin.' });
            return;
        }
        setFetchingTitle(true);
        try {
            const title = await fetchRepoTitle(githubUrl);
            if (title) {
                setProjectTitle(title);
                Toast.show({ type: 'success', text1: 'Başarılı', text2: 'Proje başlığı GitHub\'dan çekildi.' });
            } else {
                Toast.show({ type: 'error', text1: 'Hata', text2: 'GitHub\'dan başlık alınamadı.' });
            }
        } catch (_e) {
            Toast.show({ type: 'error', text1: 'Hata', text2: 'Bağlantı hatasi oluştu.' });
        } finally {
            setFetchingTitle(false);
        }
    };

    // ── Gönder ──────────────────────────────────────────────────────────────
    const handleGonder = async () => {
        if (!projectTitle.trim()) {
            Toast.show({ type: 'error', text1: 'Uyarı', text2: 'Lütfen bir proje başlığı giriniz.' });
            return;
        }
        setUploading(true);

        try {
            const userProjectsRef = collection(db, 'Users', userId, 'projects');
            await addDoc(userProjectsRef, {
                userId,
                userName: userData?.fullName || 'İsimsiz',
                title: projectTitle.trim(),
                githubUrl: githubUrl.trim(),
                readme: '',
                codeSnippet: '',
                photos: [],
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
                <View style={styles.content}>
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
                            <Pressable style={styles.badge} onPress={() => setVisibilityMenuVisible(true)}>
                                <Ionicons
                                    name={(VISIBILITY_OPTIONS.find(o => o.key === postVisibility) || VISIBILITY_OPTIONS[0]).icon}
                                    size={14}
                                    color={colors.textSub}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={styles.badgeText}>
                                    {VISIBILITY_OPTIONS.find(o => o.key === postVisibility)?.label || 'Herkes görebilir'}
                                </Text>
                                <Ionicons name="chevron-down" size={12} color={colors.textSub} style={{ marginLeft: 2 }} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Proje Başlığı */}
                    <View style={styles.inputContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={styles.inputLabel}>Proje Başlığı</Text>
                            {!!githubUrl && (
                                <TouchableOpacity
                                    onPress={handleFetchTitle}
                                    disabled={fetchingTitle}
                                    activeOpacity={0.7}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                                >
                                    {fetchingTitle ? (
                                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
                                    ) : (
                                        <Ionicons name="logo-github" size={14} color="#fff" style={{ marginRight: 4 }} />
                                    )}
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                                        {fetchingTitle ? 'Çekiliyor...' : "GitHub'dan Çek"}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TextInput
                            placeholder="Örn: Leapit Mobile App"
                            placeholderTextColor={colors.textSub}
                            value={projectTitle}
                            onChangeText={setProjectTitle}
                            style={[styles.textInput, { fontWeight: 'bold' }]}
                            maxLength={200}
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

                    {/* GitHub Bilgilendirme */}
                    <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(0, 102, 255, 0.15)' : 'rgba(0, 102, 255, 0.06)', borderColor: isDark ? 'rgba(0, 102, 255, 0.3)' : 'rgba(0, 102, 255, 0.15)' }]}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                        <Text style={[styles.infoText, { color: colors.textSub }]}>
                            Girilen GitHub linki üzerinden projenizin README açıklaması ve görselleri otomatik olarak çekilip profil detayınızda dinamik şekilde gösterilecektir.
                        </Text>
                    </View>


                </View>
            </KeyboardAvoidingView>

            <VisibilityMenu
                visible={visibilityMenuVisible}
                selected={postVisibility}
                onSelect={(key) => setPostVisibility(key)}
                onClose={() => setVisibilityMenuVisible(false)}
            />

        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, paddingHorizontal: '5%', paddingBottom: 40 },
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
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        marginBottom: 15,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
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
