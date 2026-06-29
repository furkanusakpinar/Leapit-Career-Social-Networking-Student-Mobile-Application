import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Image, Keyboard,
    KeyboardAvoidingView, Platform,
    Pressable,
    StyleSheet,
    Text, TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import CreateProfileSkeleton from '../skeleton/CreateProfileSkeleton';
import { lightTheme, darkTheme } from '../theme/colors';

const CreateProfileScreen = ({ route }) => {
    const existingUserData = route.params?.existingUserData || {};
    const userId = useSelector(state => state.user.userId);
    const themeMode = useSelector(state => state.theme?.mode || 'dark');
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);

    const navigation = useNavigation();

    const [profession, setProfession] = useState(existingUserData.profession || '');
    const [employmentType, setEmploymentType] = useState(existingUserData.employmentType || '');
    const [company, setCompany] = useState(existingUserData.company || '');
    const [school, setSchool] = useState(existingUserData.school || '');
    const [isLoading, setIsLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    const [professions, setProfessions] = useState([]);
    const [employmentTypes, setEmploymentTypes] = useState([]);
    const [sampleCompanies, setSampleCompanies] = useState([]);
    const [schools, setSchools] = useState([]);
    const [activeInput, setActiveInput] = useState(null);

    const [professionSuggestions, setProfessionSuggestions] = useState([]);
    const [employmentTypeSuggestions, setEmploymentTypeSuggestions] = useState([]);
    const [companySuggestions, setCompanySuggestions] = useState([]);
    const [schoolSuggestions, setSchoolSuggestions] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const prepareData = async () => {
            try {
                // Son 20 dk içindeki ilerlemeyi geri yükle
                const saved = await AsyncStorage.getItem('create_profile_draft');
                if (saved) {
                    const { data, timestamp } = JSON.parse(saved);
                    if (Date.now() - timestamp < 20 * 60 * 1000) {
                        if (isMounted) {
                            if (data.profession) setProfession(data.profession);
                            if (data.employmentType) setEmploymentType(data.employmentType);
                            if (data.company) setCompany(data.company);
                            if (data.school) setSchool(data.school);
                        }
                    } else {
                        await AsyncStorage.removeItem('create_profile_draft');
                    }
                }

                const [profSnap, empSnap, compSnap, schSnap] = await Promise.all([
                    getDoc(doc(db, 'professionsMap', 'TnXrQEcewZkPCfDZOqrZ')),
                    getDoc(doc(db, 'employmentTypesMap', 'S7nu6UvZrbYBRL5E4D2Z')),
                    getDoc(doc(db, 'sampleCompaniesMap', '9CPAeuCvYLqA6zaZ4TO3')),
                    getDoc(doc(db, 'schoolDomainMap', 'UyLeiZRGBdxXLYqqqbVg')),
                    
                    new Promise(res => setTimeout(res, 1200))
                ]);

                if (!isMounted) return;

                
                setProfessions(profSnap.exists() ? profSnap.data().professions : []);
                setEmploymentTypes(empSnap.exists() ? empSnap.data().employmentTypes : []);
                setSampleCompanies(compSnap.exists() ? compSnap.data().companies : []);

                const schData = schSnap.exists() ? (schSnap.data().schoolData || schSnap.data().schools || []) : [];
                setSchools(Array.isArray(schData) ? schData : Object.keys(schData));

                
                setPageLoading(false);

            } catch (err) {
                console.error('Veri çekme hatası:', err);
                
                
            }
        };
        prepareData();
        return () => { isMounted = false; };
    }, []);

    // Form değişikliklerini otomatik kaydet
    useEffect(() => {
        const saveDraft = async () => {
            try {
                await AsyncStorage.setItem('create_profile_draft', JSON.stringify({
                    data: { profession, employmentType, company, school },
                    timestamp: Date.now()
                }));
            } catch (_) {}
        };
        saveDraft();
    }, [profession, employmentType, company, school]);

    const showToast = (message) => {
        Toast.show({ type: 'custom_error', text1: 'Hata', text2: message });
    };

    const getSuggestions = (text, list) => {
        if (!text.trim() || !list) return [];
        return list.filter(item => item.toLowerCase().includes(text.toLowerCase())).slice(0, 5);
    };

    const handleSuggestionPress = (setter, suggSetter, value) => {
        setter(value);
        suggSetter([]);
        Keyboard.dismiss();
    };

    const handleAfter = async () => {
        if (isLoading) return;
        if (!profession.trim() || !company.trim() || !school.trim()) {
            return showToast('Lütfen yıldızlı alanları doldurun.');
        }
        setIsLoading(true);
        // Doğrudan Firebase'e yazmıyoruz, yerel taslakta (AsyncStorage) kalıyor.
        try {
            await AsyncStorage.setItem('step1_completed', JSON.stringify({ completed: true, timestamp: Date.now() }));
        } catch (_) {}
        navigation.replace('CreatePage2');
        setIsLoading(false);
    };

    if (pageLoading) return <CreateProfileSkeleton />;


    const SuggestionList = ({ data, onPress, isTop }) => (
        <View style={[styles.suggestionBox, isTop && styles.suggestionBoxTop]}>
            {data.map((item, index) => (
                <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => onPress(item)}>
                    <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <SafeAreaView style={{ flex: 0, backgroundColor: colors.background }} />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {}
                <View style={styles.topSection}>
                    <View style={styles.taglineWrapper}>
                        <Text style={styles.brandTagline}>Profilini Tamamla 1/2</Text>
                    </View>

                    <View style={styles.imageWrapper}>
                        <Image
                            source={require('../../assets/images/userCheck.png')}
                            style={styles.headerImage}
                        />
                    </View>
                </View>

                {}
                <View style={styles.loginCard}>
                    <Text style={styles.titleText}>En son iş ünvanı *</Text>
                    <View style={[styles.fieldWrapper, { zIndex: 50 }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Meslek seçiniz"
                            placeholderTextColor={colors.textSub}
                            value={profession}
                            onChangeText={(t) => { setProfession(t); setProfessionSuggestions(getSuggestions(t, professions)); }}
                            onFocus={() => setActiveInput('profession')}
                        />
                        {activeInput === 'profession' && professionSuggestions.length > 0 && (
                            <SuggestionList data={professionSuggestions} onPress={(v) => handleSuggestionPress(setProfession, setProfessionSuggestions, v)} />
                        )}
                    </View>

                    <Text style={styles.titleText}>İstihdam Türü</Text>
                    <View style={[styles.fieldWrapper, { zIndex: 40 }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Tam zamanlı, Staj vb."
                            placeholderTextColor={colors.textSub}
                            value={employmentType}
                            onChangeText={(t) => { setEmploymentType(t); setEmploymentTypeSuggestions(getSuggestions(t, employmentTypes)); }}
                            onFocus={() => setActiveInput('employmentType')}
                        />
                        {activeInput === 'employmentType' && employmentTypeSuggestions.length > 0 && (
                            <SuggestionList data={employmentTypeSuggestions} onPress={(v) => handleSuggestionPress(setEmploymentType, setEmploymentTypeSuggestions, v)} />
                        )}
                    </View>

                    <Text style={styles.titleText}>En son Şirket *</Text>
                    <View style={[styles.fieldWrapper, { zIndex: 10 }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Şirket adı"
                            placeholderTextColor={colors.textSub}
                            value={company}
                            onChangeText={(t) => { setCompany(t); setCompanySuggestions(getSuggestions(t, sampleCompanies)); }}
                            onFocus={() => setActiveInput('company')}
                        />
                        {activeInput === 'company' && companySuggestions.length > 0 && (
                            <SuggestionList data={companySuggestions} onPress={(v) => handleSuggestionPress(setCompany, setCompanySuggestions, v)} />
                        )}
                    </View>

                    <Text style={styles.titleText}>Okul / Üniversite *</Text>
                    <View style={[styles.fieldWrapper, { zIndex: 100 }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Mezun olduğunuz okul"
                            placeholderTextColor={colors.textSub}
                            value={school}
                            onChangeText={(t) => { setSchool(t); setSchoolSuggestions(getSuggestions(t, schools)); }}
                            onFocus={() => setActiveInput('school')}
                        />
                        {activeInput === 'school' && schoolSuggestions.length > 0 && (
                            <SuggestionList isTop={true} data={schoolSuggestions} onPress={(v) => handleSuggestionPress(setSchool, setSchoolSuggestions, v)} />
                        )}
                    </View>

                    <Pressable style={styles.button} onPress={handleAfter} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>İleri</Text>}
                    </Pressable>

                    <TouchableOpacity
                        style={styles.studentButton}
                        onPress={() => navigation.navigate('StudentPage')}
                    >
                        <Text style={styles.studentText}>Öğrenciyim</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: colors.background
    },
    container: {
        flex: 1
    },
    topSection: {
        flex: 1,
        width: '100%',
    },
    taglineWrapper: {
        paddingTop: 20,
        alignItems: 'center',
    },
    imageWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerImage: {
        width: 420,
        height: 250,
        resizeMode: 'contain',
    },
    brandTagline: {
        color: colors.textMain,
        fontSize: 22,
        fontWeight: 'bold',
    },
    loginCard: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        paddingHorizontal: 25,
        paddingTop: 30,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
        width: '100%',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: colors.border,
        overflow: 'visible',
    },
    fieldWrapper: {
        position: 'relative',
        marginBottom: 15,
        zIndex: 1,
    },
    titleText: {
        color: colors.textSub,
        marginBottom: 6,
        fontSize: 13,
        fontWeight: '600'
    },
    input: {
        backgroundColor: colors.border,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        color: colors.textMain,
        fontSize: 16
    },
    button: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 5,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    studentButton: {
        marginTop: 12,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: 'center'
    },
    studentText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 15
    },
    suggestionBox: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: colors.cardBackground,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    suggestionBoxTop: {
        top: undefined,
        bottom: '100%',
        marginBottom: 4,
    },
    suggestionItem: {
        padding: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border
    },
    suggestionText: {
        color: colors.textMain,
        fontSize: 14
    },

});

export default CreateProfileScreen;