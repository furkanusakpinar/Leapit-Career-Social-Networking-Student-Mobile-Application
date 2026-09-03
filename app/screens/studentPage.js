import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView, Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text, TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';
import { db } from '../../firebaseConfig';
import StudentPageSkeleton from '../skeleton/StudentPageSkeleton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => ({
  label: String(currentYear - i),
  value: String(currentYear - i)
}));

const days = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1).padStart(2, '0'),
  value: String(i + 1).padStart(2, '0')
}));
const months = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1).padStart(2, '0'),
  value: String(i + 1).padStart(2, '0')
}));
const birthYears = Array.from({ length: 100 }, (_, i) => ({
  label: String(currentYear - i),
  value: String(currentYear - i)
}));

const DropdownMenu = ({ data, setValue, setSearchText, setShowDropdown, isUpward = false, styles }) => (
  <View style={[styles.dropdown, isUpward ? styles.dropdownUpward : styles.dropdownDownward]}>
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 120 }}>
      {data.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.dropdownItem}
          onPress={() => {
            setValue(item.value);
            setSearchText(item.label || item.value);
            setShowDropdown(false);
            Keyboard.dismiss();
          }}
        >
          <Text style={styles.dropdownItemText}>{item.label || item.value}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

export default function StudentPage() {
  const userId = useSelector(state => state.user.userId);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [pageLoading, setPageLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [degreeTypes, setDegreeTypes] = useState([]);
  const [branchTypes, setBranchTypes] = useState([]);
  const [isOver16, setIsOver16] = useState(true);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [schools, setSchools] = useState([]);

  
  const [schoolSearchText, setSchoolSearchText] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [degreeSearchText, setDegreeSearchText] = useState('');
  const [showDegreeDropdown, setShowDegreeDropdown] = useState(false);
  const [branchSearchText, setBranchSearchText] = useState('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [startYearSearchText, setStartYearSearchText] = useState('');
  const [showStartYearDropdown, setShowStartYearDropdown] = useState(false);
  const [endYearSearchText, setEndYearSearchText] = useState('');
  const [showEndYearDropdown, setShowEndYearDropdown] = useState(false);
  const [birthDaySearchText, setBirthDaySearchText] = useState('');
  const [showBirthDayDropdown, setShowBirthDayDropdown] = useState(false);
  const [birthMonthSearchText, setBirthMonthSearchText] = useState('');
  const [showBirthMonthDropdown, setShowBirthMonthDropdown] = useState(false);
  const [birthYearSearchText, setBirthYearSearchText] = useState('');
  const [showBirthYearDropdown, setShowBirthYearDropdown] = useState(false);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const saved = await AsyncStorage.getItem('student_page_draft');
        if (saved) {
          const { data, timestamp } = JSON.parse(saved);
          if (Date.now() - timestamp < 20 * 60 * 1000) {
            if (data.schoolName) { setSchoolName(data.schoolName); setSchoolSearchText(data.schoolName); }
            if (data.degree) { setDegree(data.degree); setDegreeSearchText(data.degree); }
            if (data.branch) { setBranch(data.branch); setBranchSearchText(data.branch); }
            if (data.startYear) { setStartYear(data.startYear); setStartYearSearchText(data.startYear); }
            if (data.endYear) { setEndYear(data.endYear); setEndYearSearchText(data.endYear); }
            if (data.isOver16 !== undefined) setIsOver16(data.isOver16);
            if (data.birthDay) { setBirthDay(data.birthDay); setBirthDaySearchText(data.birthDay); }
            if (data.birthMonth) { setBirthMonth(data.birthMonth); setBirthMonthSearchText(data.birthMonth); }
            if (data.birthYear) { setBirthYear(data.birthYear); setBirthYearSearchText(data.birthYear); }
          } else {
            await AsyncStorage.removeItem('student_page_draft');
          }
        }

        const [degreeSnap, branchSnap, schoolSnap] = await Promise.all([
          getDoc(doc(db, 'degreeTypesMap', '3d0xnZf7UXCic5zPNzh4')),
          getDoc(doc(db, 'branchTypesMap', 'xocEo86W6vh0j8NloSOx')),
          getDoc(doc(db, 'schoolDomainMap', 'UyLeiZRGBdxXLYqqqbVg'))
        ]);

        setDegreeTypes(degreeSnap.exists() ? degreeSnap.data().values || [] : []);
        setBranchTypes(branchSnap.exists() ? branchSnap.data().values || [] : []);

        if (schoolSnap.exists()) {
          const data = schoolSnap.data() || {};
          let list = [];
          Object.keys(data).forEach(k => {
            const name = String(k || '').trim();
            if (name.length > 1 && !name.includes('.edu')) list.push(name);
          });
          const uniq = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'tr'));
          setSchools(uniq);
        }
        setPageLoading(false);
      } catch (e) {
        console.error('Veri çekilemedi:', e);
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    const saveDraft = async () => {
      try {
        await AsyncStorage.setItem('student_page_draft', JSON.stringify({
          data: { schoolName, degree, branch, startYear, endYear, isOver16, birthDay, birthMonth, birthYear },
          timestamp: Date.now()
        }));
      } catch (_) {}
    };
    saveDraft();
  }, [schoolName, degree, branch, startYear, endYear, isOver16, birthDay, birthMonth, birthYear]);

  const handleSave = async () => {
    if (!schoolName.trim() || !startYear.trim() || !endYear.trim()) {
      Toast.show({ type: 'info', text1: 'Lütfen yıldızlı alanları doldurun.' });
      return;
    }
    setIsLoading(true);
    try {
      if (userId) {
        const studentData = {
          school: schoolName,
          degree,
          branch,
          startYear,
          endYear,
          isOver16,
        };
        if (!isOver16 && birthDay && birthMonth && birthYear) {
          studentData.birthDate = `${birthDay}-${birthMonth}-${birthYear}`;
        }
        await updateDoc(doc(db, 'Users', userId), studentData);
      }
    } catch (e) {
      console.error('Öğrenci bilgileri Firestore kaydedilirken hata:', e);
    }
    try {
      await AsyncStorage.setItem('step1_completed', JSON.stringify({ completed: true, timestamp: Date.now() }));
    } catch (_) {}
    navigation.replace('CreatePage2');
    setIsLoading(false);
  };

  if (pageLoading) return <StudentPageSkeleton />;

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={{ flex: 0, backgroundColor: colors.background }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.topSection}>
            <View style={styles.taglineWrapper}>
              <Text style={styles.brandTagline}>Öğrenci Profilini Tamamla 1/2</Text>
            </View>
            <View style={styles.imageWrapper}>
              <Image
                source={require('../../assets/images/3dStudent.png')}
                style={styles.headerImage}
              />
            </View>
          </View>

          <View style={[styles.loginCard, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.titleText}>Okul veya Üniversite *</Text>
            <View style={[styles.fieldWrapper, { zIndex: 9000 }]}>
              <TextInput
                placeholder="Okul seçiniz"
                placeholderTextColor={colors.textSub}
                style={styles.input}
                value={schoolSearchText}
                onChangeText={t => { setSchoolSearchText(t); setSchoolName(t); setShowSchoolDropdown(true); }}
                onFocus={() => setShowSchoolDropdown(true)}
                maxLength={100}
              />
              {showSchoolDropdown && schoolSearchText.length > 0 && (
                <DropdownMenu 
                  data={schools.filter(s => s.toLowerCase().includes(schoolSearchText.toLowerCase())).map(s => ({ label: s, value: s }))} 
                  setValue={setSchoolName} 
                  setSearchText={setSchoolSearchText} 
                  setShowDropdown={setShowSchoolDropdown}
                  styles={styles} 
                />
              )}
            </View>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroupHalf, { zIndex: 8000 }]}>
                <Text style={styles.titleText}>Derece</Text>
                <TextInput
                  placeholder="Örn: Lisans"
                  placeholderTextColor={colors.textSub}
                  style={styles.input}
                  value={degreeSearchText}
                  onChangeText={t => { setDegreeSearchText(t); setDegree(t); setShowDegreeDropdown(true); }}
                  maxLength={100}
                />
                {showDegreeDropdown && (
                  <DropdownMenu 
                    data={degreeTypes.filter(d => d.toLowerCase().includes(degreeSearchText.toLowerCase())).map(d => ({ label: d, value: d }))} 
                    setValue={setDegree} 
                    setSearchText={setDegreeSearchText} 
                    setShowDropdown={setShowDegreeDropdown}
                    styles={styles} 
                  />
                )}
              </View>
              <View style={[styles.inputGroupHalf, { zIndex: 8000 }]}>
                <Text style={styles.titleText}>Branş</Text>
                <TextInput
                  placeholder="Örn: Tasarım"
                  placeholderTextColor={colors.textSub}
                  style={styles.input}
                  value={branchSearchText}
                  onChangeText={t => { setBranchSearchText(t); setBranch(t); setShowBranchDropdown(true); }}
                  maxLength={100}
                />
                {showBranchDropdown && (
                  <DropdownMenu 
                    data={branchTypes.filter(b => b.toLowerCase().includes(branchSearchText.toLowerCase())).map(b => ({ label: b, value: b }))} 
                    setValue={setBranch} 
                    setSearchText={setBranchSearchText} 
                    setShowDropdown={setShowBranchDropdown}
                    styles={styles} 
                  />
                )}
              </View>
            </View>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroupHalf, { zIndex: 7000 }]}>
                <Text style={styles.titleText}>Başlangıç *</Text>
                <TextInput
                  placeholder="Yıl"
                  placeholderTextColor={colors.textSub}
                  style={styles.input}
                  keyboardType="numeric"
                  value={startYearSearchText}
                  onChangeText={t => { setStartYearSearchText(t); setStartYear(t); setShowStartYearDropdown(true); }}
                />
                {showStartYearDropdown && (
                  <DropdownMenu 
                    data={years.filter(y => y.label.includes(startYearSearchText))} 
                    setValue={setStartYear} 
                    setSearchText={setStartYearSearchText} 
                    setShowDropdown={setShowStartYearDropdown}
                    styles={styles} 
                  />
                )}
              </View>
              <View style={[styles.inputGroupHalf, { zIndex: 7000 }]}>
                <Text style={styles.titleText}>Bitiş *</Text>
                <TextInput
                  placeholder="Yıl"
                  placeholderTextColor={colors.textSub}
                  style={styles.input}
                  keyboardType="numeric"
                  value={endYearSearchText}
                  onChangeText={t => { setEndYearSearchText(t); setEndYear(t); setShowEndYearDropdown(true); }}
                />
                {showEndYearDropdown && (
                  <DropdownMenu 
                    data={years.filter(y => y.label.includes(endYearSearchText))} 
                    setValue={setEndYear} 
                    setSearchText={setEndYearSearchText} 
                    setShowDropdown={setShowEndYearDropdown}
                    styles={styles} 
                  />
                )}
              </View>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.labelSwitch}>16 yaşından büyüğüm</Text>
              <Switch
                trackColor={{ false: '#767577', true: colors.primary }}
                thumbColor="#f4f3f4"
                onValueChange={setIsOver16}
                value={isOver16}
              />
            </View>

            {!isOver16 && (
              <View style={styles.birthDateContainer}>
                <Text style={styles.titleText}>Doğum Tarihi *</Text>
                <View style={styles.rowContainer}>
                  <View style={styles.datePickerItem}>
                    <TextInput placeholder="G" placeholderTextColor={colors.textSub} style={styles.input} value={birthDaySearchText} onChangeText={t => { setBirthDaySearchText(t); setBirthDay(t); setShowBirthDayDropdown(true) }} keyboardType="numeric" />
                    {showBirthDayDropdown && <DropdownMenu data={days} setValue={setBirthDay} setSearchText={setBirthDaySearchText} setShowDropdown={setShowBirthDayDropdown} isUpward={true} styles={styles} />}
                  </View>
                  <View style={styles.datePickerItem}>
                    <TextInput placeholder="A" placeholderTextColor={colors.textSub} style={styles.input} value={birthMonthSearchText} onChangeText={t => { setBirthMonthSearchText(t); setBirthMonth(t); setShowBirthMonthDropdown(true) }} keyboardType="numeric" />
                    {showBirthMonthDropdown && <DropdownMenu data={months} setValue={setBirthMonth} setSearchText={setBirthMonthSearchText} setShowDropdown={setShowBirthMonthDropdown} isUpward={true} styles={styles} />}
                  </View>
                  <View style={styles.datePickerItem}>
                    <TextInput placeholder="Y" placeholderTextColor={colors.textSub} style={styles.input} value={birthYearSearchText} onChangeText={t => { setBirthYearSearchText(t); setBirthYear(t); setShowBirthYearDropdown(true) }} keyboardType="numeric" />
                    {showBirthYearDropdown && <DropdownMenu data={birthYears} setValue={setBirthYear} setSearchText={setBirthYearSearchText} setShowDropdown={setShowBirthYearDropdown} isUpward={true} styles={styles} />}
                  </View>
                </View>
              </View>
            )}

            <Pressable style={styles.button} onPress={handleSave} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>İleri</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'flex-end' },
  topSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  taglineWrapper: { marginTop: 10, alignItems: 'center' },
  imageWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerImage: { width: 350, height: 220, resizeMode: 'contain' },
  brandTagline: { color: colors.textMain, fontSize: 20, fontWeight: 'bold' },
  loginCard: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 25,
    width: '100%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  fieldWrapper: { position: 'relative', marginBottom: 12 },
  titleText: { color: colors.textSub, marginBottom: 4, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    justifyContent: 'center',
    color: colors.textMain,
    fontSize: 16
  },
  rowContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 10 },
  inputGroupHalf: { flex: 1, position: 'relative' },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 2 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderRadius: 12,
    marginTop: 5
  },
  labelSwitch: { color: colors.textSub, fontSize: 14 },
  dropdown: {
    position: 'absolute',
    backgroundColor: colors.cardBackground,
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10000
  },
  dropdownDownward: { top: 50 },
  dropdownUpward: { bottom: 50 },
  dropdownItem: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  dropdownItemText: { color: colors.textMain, fontSize: 13 },
  birthDateContainer: { marginTop: 8, },
  datePickerItem: { flex: 1, position: 'relative' }
});