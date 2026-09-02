import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { darkTheme, lightTheme } from '../theme/colors';

const SuggestionList = ({ data, onPress, styles }) => (
  <View style={styles.suggestionBox}>
    {data.map((item, index) => (
      <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => onPress(item)}>
        <Text style={styles.suggestionText}>{item}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export default function ProfileEdit() {
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [profession, setProfession] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [company, setCompany] = useState('');
  const [school, setSchool] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');

  const [allProfessions, setAllProfessions] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [allEmploymentTypes, setAllEmploymentTypes] = useState([]);
  const [allSchools, setAllSchools] = useState([]);
  const [professionSuggestions, setProfessionSuggestions] = useState([]);
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [employmentTypeSuggestions, setEmploymentTypeSuggestions] = useState([]);
  const [schoolSuggestions, setSchoolSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [profSnap, compSnap, empSnap, schSnap] = await Promise.all([
          getDoc(doc(db, 'professionsMap', 'TnXrQEcewZkPCfDZOqrZ')),
          getDoc(doc(db, 'sampleCompaniesMap', '9CPAeuCvYLqA6zaZ4TO3')),
          getDoc(doc(db, 'employmentTypesMap', 'S7nu6UvZrbYBRL5E4D2Z')),
          getDoc(doc(db, 'schoolDomainMap', 'UyLeiZRGBdxXLYqqbVg'))
        ]);
        setAllProfessions(profSnap.exists() ? profSnap.data().professions : []);
        setAllCompanies(compSnap.exists() ? compSnap.data().companies : []);
        setAllEmploymentTypes(empSnap.exists() ? empSnap.data().employmentTypes : []);
        const schData = schSnap.exists() ? (schSnap.data().schoolData || schSnap.data().schools || []) : [];
        setAllSchools(Array.isArray(schData) ? schData : Object.keys(schData));
      } catch (err) {
        console.error('Öneri verileri çekilemedi:', err);
      }
    };
    fetchAllData();
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!userId) return;
      try {
        const userDocSnap = await getDoc(doc(db, 'Users', userId));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setProfession(userData.profession || '');
          setEmploymentType(userData.employmentType || '');
          setCompany(userData.company || '');
          setSchool(userData.school || '');
          setDegree(userData.degree || '');
          setBranch(userData.branch || '');
          setStartYear(userData.startYear || '');
          setEndYear(userData.endYear || '');
          setIsStudent(!!(userData.degree || userData.branch));
        }
      } catch (error) {
        console.error('Kullanıcı verisi çekilirken hata:', error);
      }
    };
    fetchCurrentUser();
  }, [userId]);

  const getSuggestions = (text, list) => {
    if (!text.trim() || !list) return [];
    return list.filter(item => item.toLowerCase().includes(text.toLowerCase())).slice(0, 5);
  };

  const handleSuggestionPress = (setter, suggSetter, value) => {
    setter(value);
    suggSetter([]);
    Keyboard.dismiss();
  };

  const handleSave = async () => {
    if (!userId) {
      alert('Hata: Kullanıcı kimliği bulunamadı.');
      return;
    }
    setIsLoading(true);
    try {
      const updateData = {
        profession: profession.trim(),
        employmentType: employmentType.trim(),
        company: company.trim(),
        school: school.trim(),
      };
      if (isStudent) {
        updateData.degree = degree.trim();
        updateData.branch = branch.trim();
        updateData.startYear = startYear.trim();
        updateData.endYear = endYear.trim();
      } else {
        updateData.degree = '';
        updateData.branch = '';
        updateData.startYear = '';
        updateData.endYear = '';
      }
      await updateDoc(doc(db, 'Users', userId), updateData);
      alert('Bilgileriniz başarıyla güncellendi!');
      navigation.goBack();
    } catch (e) {
      console.error('Bilgiler güncellenemedi:', e);
      alert('Hata: Kaydedilirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setProfessionSuggestions([]); setCompanySuggestions([]); setEmploymentTypeSuggestions([]); setSchoolSuggestions([]); }}>
          <View style={styles.innerContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()}>
                  <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
                </Pressable>
                <Text style={styles.title}>Meslek ve Eğitim</Text>
              </View>

              <Text style={styles.labelText}>Meslek</Text>
              <View style={[styles.fieldWrapper, { zIndex: 100 }]}>
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Mesleğinizi yazın"
                    placeholderTextColor={colors.textSub}
                    value={profession}
                    onChangeText={(t) => { setProfession(t); setProfessionSuggestions(getSuggestions(t, allProfessions)); }}
                    onFocus={() => setActiveInput('profession')}
                    style={styles.input}
                    maxLength={100}
                  />
                </View>
                {activeInput === 'profession' && professionSuggestions.length > 0 && (
                  <SuggestionList data={professionSuggestions} onPress={(v) => handleSuggestionPress(setProfession, setProfessionSuggestions, v)} styles={styles} />
                )}
              </View>

              <Text style={styles.labelText}>İstihdam Türü</Text>
              <View style={[styles.fieldWrapper, { zIndex: 95 }]}>
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Tam zamanlı, Staj vb."
                    placeholderTextColor={colors.textSub}
                    value={employmentType}
                    onChangeText={(t) => { setEmploymentType(t); setEmploymentTypeSuggestions(getSuggestions(t, allEmploymentTypes)); }}
                    onFocus={() => setActiveInput('employmentType')}
                    style={styles.input}
                    maxLength={100}
                  />
                </View>
                {activeInput === 'employmentType' && employmentTypeSuggestions.length > 0 && (
                  <SuggestionList data={employmentTypeSuggestions} onPress={(v) => handleSuggestionPress(setEmploymentType, setEmploymentTypeSuggestions, v)} styles={styles} />
                )}
              </View>

              <Text style={styles.labelText}>Şirket</Text>
              <View style={[styles.fieldWrapper, { zIndex: 90 }]}>
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Çalıştığınız şirket (öğrenciyken de yazabilirsiniz)"
                    placeholderTextColor={colors.textSub}
                    value={company}
                    onChangeText={(t) => { setCompany(t); setCompanySuggestions(getSuggestions(t, allCompanies)); }}
                    onFocus={() => setActiveInput('company')}
                    style={styles.input}
                    maxLength={100}
                  />
                </View>
                {activeInput === 'company' && companySuggestions.length > 0 && (
                  <SuggestionList data={companySuggestions} onPress={(v) => handleSuggestionPress(setCompany, setCompanySuggestions, v)} styles={styles} />
                )}
              </View>

              <Text style={styles.labelText}>Okul</Text>
              <View style={[styles.fieldWrapper, { zIndex: 85 }]}>
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Okul adı"
                    placeholderTextColor={colors.textSub}
                    value={school}
                    onChangeText={(t) => { setSchool(t); setSchoolSuggestions(getSuggestions(t, allSchools)); }}
                    onFocus={() => setActiveInput('school')}
                    style={styles.input}
                    maxLength={100}
                  />
                </View>
                {activeInput === 'school' && schoolSuggestions.length > 0 && (
                  <SuggestionList data={schoolSuggestions} onPress={(v) => handleSuggestionPress(setSchool, setSchoolSuggestions, v)} styles={styles} />
                )}
              </View>

              <View style={styles.toggleCard}>
                <Text style={styles.toggleLabel}>Öğrenciyim</Text>
                <Switch
                  value={isStudent}
                  onValueChange={setIsStudent}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Text style={styles.toggleHint}>
                Öğrenciliğiniz bittiğinde kapatın; öğrenci bilgileri temizlenir ve meslek/şirket bilgileriniz gösterilir.
              </Text>

              {isStudent && (
                <>
                  <Text style={styles.labelText}>Derece</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder="Örn. Lise Diploması, Lisans..."
                      placeholderTextColor={colors.textSub}
                      value={degree}
                      onChangeText={setDegree}
                      style={styles.input}
                      maxLength={100}
                    />
                  </View>

                  <Text style={styles.labelText}>Branş</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder="Örn. Yazılım Mühendisliği"
                      placeholderTextColor={colors.textSub}
                      value={branch}
                      onChangeText={setBranch}
                      style={styles.input}
                      maxLength={100}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.labelText}>Başlangıç Yılı</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          placeholder="2015"
                          placeholderTextColor={colors.textSub}
                          keyboardType="number-pad"
                          value={startYear}
                          onChangeText={setStartYear}
                          style={styles.input}
                          maxLength={4}
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.labelText}>Bitiş Yılı</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          placeholder="2028"
                          placeholderTextColor={colors.textSub}
                          keyboardType="number-pad"
                          value={endYear}
                          onChangeText={setEndYear}
                          style={styles.input}
                          maxLength={4}
                        />
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [styles.publishBtn, { backgroundColor: pressed ? colors.primary + 'CC' : colors.primary }]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.publishText}>KAYDET</Text>
              )}
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  innerContent: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  title: { color: colors.textMain, fontSize: 18, flex: 1, textAlign: 'center', marginRight: 32, fontWeight: 'bold' },
  labelText: { color: colors.textSub, fontSize: 13, marginBottom: 6, fontWeight: '500' },
  fieldWrapper: { position: 'relative', width: '100%' },
  inputContainer: {
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 16,
    justifyContent: 'center'
  },
  input: { color: colors.textMain, fontSize: 16, height: '100%' },
  suggestionBox: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
    elevation: 5
  },
  suggestionItem: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  suggestionText: { color: colors.textMain, fontSize: 14 },
  toggleCard: {
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  toggleLabel: { color: colors.textMain, fontSize: 15, fontWeight: '500' },
  toggleHint: { color: colors.textSub, fontSize: 12, marginBottom: 16, marginTop: -4 },
  publishBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  publishText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});