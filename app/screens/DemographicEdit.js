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

const SUGGESTED_SKILLS = [
  'Yazılım', 'Tasarım', 'Pazarlama', 'Satış', 'Proje Yönetimi',
  'Veri Analizi', 'UI/UX', 'Mobil Geliştirme', 'İnsan Kaynakları', 'Finans'
];

const SUGGESTED_LANGUAGES = [
  'Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'İspanyolca',
  'Rusça', 'Arapça', 'Çince'
];

const SUGGESTED_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya',
  'Adana', 'Gaziantep', 'Konya', 'Eskişehir', 'Trabzon'
];

const SUGGESTED_INTERESTS = [
  'Teknoloji', 'Startup', 'Eğitim', 'Spor', 'Sanat',
  'Girişimcilik', 'Yapay Zeka', 'Kariyer', 'Sürdürülebilirlik', 'Sağlık'
];

const ChipInput = ({ label, chipColor, items, setItems, allItems, colors, styles }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const removeItem = (item) => setItems(items.filter(i => i !== item));

  const addItem = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!items.includes(trimmed)) {
      setItems([...items, trimmed]);
    }
    setInput('');
    setSuggestions([]);
  };

  const onChange = (text) => {
    setInput(text);
    if (text.length > 0) {
      const filtered = allItems.filter(
        s => s.toLowerCase().includes(text.toLowerCase()) && !items.includes(s)
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.labelText}>{label}</Text>
      <View style={styles.chipWrap}>
        {items.map((item) => (
          <TouchableOpacity key={item} style={[styles.chip, { backgroundColor: chipColor }]} onPress={() => removeItem(item)}>
            <Text style={styles.chipText}>{item}</Text>
            <Text style={styles.chipRemove}>×</Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.chipInput}
          placeholder="Ekle..."
          placeholderTextColor={colors.textSub}
          value={input}
          onChangeText={onChange}
          onSubmitEditing={() => addItem(input)}
          blurOnSubmit={false}
          maxLength={60}
        />
      </View>
      {suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          {suggestions.map((s, index) => (
            <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => addItem(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function DemographicEdit() {
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [interests, setInterests] = useState([]);

  const [citySuggestions, setCitySuggestions] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const snap = await getDoc(doc(db, 'Users', userId));
        if (snap.exists()) {
          const d = snap.data();
          setCity(d.city || '');
          setCountry(d.country || '');
          setBio(d.bio || '');
          setSkills(d.skills || []);
          setLanguages(d.languages || []);
          setInterests(d.interests || []);
        }
      } catch (e) {
        console.error('Demografik bilgi çekme hatası:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'Users', userId), {
        city: city.trim(),
        country: country.trim(),
        bio: bio.trim(),
        skills,
        languages,
        interests,
      });
      navigation.goBack();
    } catch (e) {
      console.error('Demografik bilgi kaydetme hatası:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.innerContent}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.flex}>
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
                <Image
                  source={require('../../assets/images/back.png')}
                  style={[styles.backIcon, { tintColor: colors.iconTint }]}
                />
              </Pressable>
              <Text style={styles.title}>Kişisel Bilgiler</Text>
              <View style={styles.backBtn} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionHint}>
                Bu bilgiler profilinizde ve size özel önerilerde kullanılır.
              </Text>

              <View style={styles.section}>
                <Text style={styles.labelText}>Konum</Text>
                <View style={styles.rowFields}>
                  <View style={[styles.inputContainer, styles.flex, { zIndex: 60 }]}>
                    <TextInput
                      placeholder="Şehir"
                      placeholderTextColor={colors.textSub}
                      value={city}
                      onChangeText={(text) => {
                        setCity(text);
                        if (text.length > 0) {
                          setCitySuggestions(
                            SUGGESTED_CITIES.filter(c => c.toLowerCase().includes(text.toLowerCase())).slice(0, 5)
                          );
                        } else {
                          setCitySuggestions([]);
                        }
                      }}
                      style={styles.input}
                      maxLength={40}
                    />
                    {citySuggestions.length > 0 && (
                      <View style={styles.suggestionBox}>
                        {citySuggestions.map((c, index) => (
                          <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => { setCity(c); setCitySuggestions([]); }}>
                            <Text style={styles.suggestionText}>{c}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={[styles.inputContainer, styles.flex]}>
                    <TextInput
                      placeholder="Ülke"
                      placeholderTextColor={colors.textSub}
                      value={country}
                      onChangeText={setCountry}
                      style={styles.input}
                      maxLength={40}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.labelText}>Hakkında</Text>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Kendinden kısaca bahset..."
                  placeholderTextColor={colors.textSub}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  maxLength={500}
                />
                <Text style={styles.characterCount}>{bio.length}/500</Text>
              </View>

              <ChipInput
                label="Beceriler"
                chipColor={colors.primary + '22'}
                items={skills}
                setItems={setSkills}
                allItems={SUGGESTED_SKILLS}
                colors={colors}
                styles={styles}
              />

              <ChipInput
                label="Diller"
                chipColor={colors.primary + '33'}
                items={languages}
                setItems={setLanguages}
                allItems={SUGGESTED_LANGUAGES}
                colors={colors}
                styles={styles}
              />

              <ChipInput
                label="İlgi Alanları"
                chipColor={colors.primary + '44'}
                items={interests}
                setItems={setInterests}
                allItems={SUGGESTED_INTERESTS}
                colors={colors}
                styles={styles}
              />
            </ScrollView>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [styles.publishBtn, { backgroundColor: pressed ? colors.primary + 'CC' : colors.primary }]}
              disabled={isSaving}
            >
              {isSaving ? (
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  innerContent: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  backBtn: {
    width: 32,
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  title: {
    color: colors.textMain,
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  sectionHint: {
    color: colors.textSub,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 22,
  },
  labelText: {
    color: colors.textSub,
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inputContainer: {
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 16,
    justifyContent: 'center',
  },
  input: {
    color: colors.textMain,
    fontSize: 16,
  },
  bioInput: {
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.textMain,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: colors.textSub,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textMain,
    fontSize: 14,
  },
  chipRemove: {
    color: colors.textSub,
    fontSize: 16,
    marginLeft: 6,
    fontWeight: 'bold',
  },
  chipInput: {
    minWidth: 90,
    flexGrow: 1,
    color: colors.textMain,
    fontSize: 15,
    paddingVertical: 8,
  },
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
    elevation: 5,
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.textMain,
    fontSize: 14,
  },
  publishBtn: {
    marginHorizontal: 16,
    marginVertical: 12,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
