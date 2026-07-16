import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
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
  Text, TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';

const fallbackPolicyItems = [
  { label: 'İş yerinde', value: 'İş yerinde', desc: 'Çalışanlar, çalışmak için fiziksel olarak geliyor.' },
  { label: 'Hybrid', value: 'Hybrid', desc: 'Çalışanlar ofiste ve ofis dışında çalışır.' },
  { label: 'Uzaktan', value: 'Uzaktan', desc: 'Çalışanlar, ofis dışında çalışır' },
];

const SuggestionList = ({ data, onPress, styles }) => (
  <View style={styles.suggestionBox}>
    {data.map((item, index) => (
      <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => onPress(item)}>
        <Text style={styles.suggestionText}>{item}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export function JobsPostingPage() {
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);
  const pickerStyles = getPickerStyles(colors);

  const navigation = useNavigation();

  const [jobTitle, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobPolicy, setPolicy] = useState(null);
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState(null);
  const [wage, setWage] = useState('');

  const [policyList, setPolicyList] = useState(null);
  const [typeList, setTypeList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [allProfessions, setAllProfessions] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [professionSuggestions, setProfessionSuggestions] = useState([]);
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [policySnap, typeSnap, profSnap, compSnap] = await Promise.all([
          getDoc(doc(db, 'jobLists', 'policies')),
          getDoc(doc(db, 'jobLists', 'types')),
          getDoc(doc(db, 'professionsMap', 'TnXrQEcewZkPCfDZOqrZ')),
          getDoc(doc(db, 'sampleCompaniesMap', '9CPAeuCvYLqA6zaZ4TO3'))
        ]);

        setPolicyList(policySnap.exists() ? policySnap.data().policyItems : fallbackPolicyItems);
        setTypeList(typeSnap.exists() ? typeSnap.data().typeItems : []);
        setAllProfessions(profSnap.exists() ? profSnap.data().professions : []);
        setAllCompanies(compSnap.exists() ? compSnap.data().companies : []);

      } catch (err) {
        console.error('Veri çekme hatası:', err);
        setPolicyList(fallbackPolicyItems);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  
  const getSelectedPolicyDesc = () => {
    if (!jobPolicy || !policyList) return null;
    const selected = policyList.find(p => p.value === jobPolicy);
    return selected ? selected.desc : null;
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

  const handleNext = () => {
    if (!jobTitle.trim() || !company.trim() || !jobPolicy || !location.trim() || !jobType) {
      alert('Tüm alanları eksiksiz doldurmalısın!');
      return;
    }
    navigation.navigate('JobsPost2', {
      jobTitle, company, jobPolicy, location, jobType, userId, wage
    });
  };



  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setProfessionSuggestions([]); setCompanySuggestions([]); }}>
          <View style={styles.innerContent}>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()}>
                  <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
                </Pressable>
                <Text style={styles.title}>İş İlanı Oluştur</Text>
              </View>

              <Text style={styles.labelText}>İş ünvanı *</Text>
              <View style={[styles.fieldWrapper, { zIndex: 100 }]}>
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Örn: Frontend Developer"
                    placeholderTextColor={colors.textSub}
                    value={jobTitle}
                    onChangeText={(t) => { setTitle(t); setProfessionSuggestions(getSuggestions(t, allProfessions)); }}
                    onFocus={() => setActiveInput('jobTitle')}
                    style={styles.input}
                    maxLength={100}
                  />
                </View>
                {activeInput === 'jobTitle' && professionSuggestions.length > 0 && (
                  <SuggestionList data={professionSuggestions} onPress={(v) => handleSuggestionPress(setTitle, setProfessionSuggestions, v)} styles={styles} />
                )}
              </View>

              <Text style={styles.labelText}>Şirket *</Text>
              <View style={[styles.fieldWrapper, { zIndex: 90 }]}>
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Şirket adı"
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

              <Text style={styles.labelText}>İşyeri politikası *</Text>
              <View style={styles.pickerWrapper}>
                <RNPickerSelect
                  onValueChange={setPolicy}
                  value={jobPolicy}
                  items={policyList || []}
                  placeholder={{ label: 'Politika seçiniz...', value: null, color: colors.textSub }}
                  useNativeAndroidPickerStyle={false}
                  style={pickerStyles}
                  Icon={() => <MaterialCommunityIcons name="menu-down" size={28} color={colors.textMain} />}
                />
              </View>

              {}
              {jobPolicy && getSelectedPolicyDesc() && (
                <View style={styles.descBox}>
                  <MaterialCommunityIcons name="information" size={18} color={colors.primary} />
                  <Text style={styles.descText}>{getSelectedPolicyDesc()}</Text>
                </View>
              )}

              <Text style={styles.labelText}>İşin konumu *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Şehir, Bölge"
                  placeholderTextColor={colors.textSub}
                  value={location}
                  onChangeText={setLocation}
                  style={styles.input}
                  maxLength={150}
                />
              </View>

              <Text style={styles.labelText}>İş türü *</Text>
              <View style={styles.pickerWrapper}>
                <RNPickerSelect
                  onValueChange={setJobType}
                  value={jobType}
                  items={typeList || []}
                  placeholder={{ label: 'İş türü seçiniz...', value: null, color: colors.textSub }}
                  useNativeAndroidPickerStyle={false}
                  style={pickerStyles}
                  Icon={() => <MaterialCommunityIcons name="menu-down" size={28} color={colors.textMain} />}
                />
              </View>
            </ScrollView>

            <Pressable onPress={handleNext} style={({ pressed }) => [styles.publishBtn, { backgroundColor: pressed ? colors.primary + 'CC' : colors.primary }]}>
              <Text style={styles.publishText}>İLERİ</Text>
            </Pressable>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  innerContent: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  title: { color: colors.textMain, fontSize: 18, flex: 1, textAlign: 'center', marginRight: 32, fontWeight: 'bold' },
  labelText: { color: colors.textSub, fontSize: 13, marginBottom: 6, fontWeight: '500' },
  fieldWrapper: { position: 'relative', width: '100%' },
  inputContainer: {
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 16,
    justifyContent: 'center'
  },
  input: { color: colors.textMain, fontSize: 15, height: '100%' },
  pickerWrapper: {
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 16,
    justifyContent: 'center'
  },
  descBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '1A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    marginTop: -8,
    alignItems: 'center'
  },
  descText: { color: colors.textSub, fontSize: 13, marginLeft: 8, flex: 1 },
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
  publishBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  publishText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

const getPickerStyles = (colors) => StyleSheet.create({
  inputIOS: { fontSize: 15, color: colors.textMain, paddingRight: 30, height: 55 },
  inputAndroid: { fontSize: 15, color: colors.textMain, paddingRight: 30, height: 55, width: '100%' },
  iconContainer: { top: 12, right: 0 },
});

export default JobsPostingPage;