import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { darkTheme, lightTheme } from '../theme/colors';
import { sendEmail } from '../utils/emailjs';

export function JobsPost3() {
  const userId = useSelector(state => state.user.userId);
  const userData = useSelector(state => state.user.userData);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);
  const pickerStyles = getPickerStyles(colors);

  const navigation = useNavigation();
  const route = useRoute();

  const [seletion, setSeletion] = useState('email');
  const [advertiser, setAdvertiser] = useState('');
  const [issubmitting, setIsSubmitting] = useState(false);

  const handleGonder = async () => {
    if (!advertiser.trim()) {
      Alert.alert('Hata', 'Lütfen iletişim bilgisini doldurunuz.');
      return;
    }

    setIsSubmitting(true);

    try {
      
      const params = route.params || {};

      
      let advertiserName = userData?.fullName || '';
      let userEmail = userData?.email || '';

      if (!advertiserName && userId) {
        try {
          const userSnap = await getDoc(doc(db, 'Users', userId));
          if (userSnap.exists()) {
            advertiserName = userSnap.data().fullName || '';
            userEmail = userSnap.data().email || userEmail;
          }
        } catch (e) {
          console.warn('Kullanıcı verisi çekilemedi:', e);
        }
      }

      const postData = {
        jobTitle: params.jobTitle || '',
        company: params.company || '',
        jobPolicy: params.jobPolicy || '',
        jobLocation: params.location || '',
        jobType: params.jobType || '',
        wage: params.wage || '',
        jobSummary: params.jobSummary || '',
        jobDescription: params.jobDescription || '',
        userId: userId,
        advertiser: advertiser,
        applicationMethod: seletion,
        advertiserName: advertiserName || 'İsimsiz Kullanıcı',
        userEmail: userEmail,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'JobsPosts'), postData);

      const adminParams = {
        to_email: 'leapitapp@gmail.com',
        from_name: postData.advertiserName,
        user_email: postData.userEmail,
        job_title: postData.jobTitle,
        company: postData.company,
        job_location_info: postData.jobLocation, 
        details: `Maaş: ${postData.wage}, İlan Tipi: ${postData.jobType}`,
        approve_url: `leapit://approve-job/${docRef.id}`,
        reject_url: `leapit://reject-job/${docRef.id}`,
      };

      try {
        await sendEmail(
          'service_4xxp89b',
          'template_y1g1ftj',
          adminParams
        );
      } catch (emailError) {
        console.warn('Admin bilgilendirme maili gönderilemedi:', emailError);
      }

      if (Platform.OS === 'android') {
        ToastAndroid.show("İlan onay için gönderildi.", ToastAndroid.SHORT);
      } else {
        Alert.alert("Başarılı", "İlanınız onaylandıktan sonra yayına alınacaktır.");
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'JobsPage' }]
      });

    } catch (error) {
      console.error('Yayınlama Hatası:', error);
      Alert.alert('Hata', 'İlan kaydedilirken bir sorun oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContent}>
            <View>
              <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()}>
                  <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
                </Pressable>
                <Text style={styles.title}>İş İlanı 2/2</Text>
              </View>

              <Text style={styles.mainPrompt}>Nitelikli adaylardan başvuru alın</Text>

              <Text style={styles.label}>Başvuru Yöntemi</Text>
              <View style={styles.pickerContainer}>
                <RNPickerSelect
                  onValueChange={setSeletion}
                  value={seletion}
                  items={[
                    { label: 'E-posta üzerinden', value: 'email' },
                    { label: 'Web site üzerinden', value: 'web' },
                  ]}
                  style={pickerStyles}
                  useNativeAndroidPickerStyle={false}
                  Icon={() => <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textMain} />}
                  placeholder={{}}
                />
              </View>

              <Text style={styles.label}>
                {seletion === 'email' ? 'E-posta Adresi' : 'Başvuru Linki'}
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={seletion === 'email' ? 'ornek@is.com' : 'https://...'}
                  placeholderTextColor={colors.textSub}
                  value={advertiser}
                  onChangeText={setAdvertiser}
                  keyboardType={seletion === 'email' ? 'email-address' : 'url'}
                  autoCapitalize="none"
                  maxLength={200}
                />
              </View>
            </View>

            <Pressable
              onPress={handleGonder}
              disabled={issubmitting}
              style={({ pressed }) => [
                styles.publishBtn,
                { opacity: (pressed || issubmitting) ? 0.7 : 1 }
              ]}
            >
              <Text style={styles.publishText}>
                {issubmitting ? 'YAYINLANIYOR...' : 'YAYINLA'}
              </Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  innerContent: { flex: 1, padding: '5%', justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  title: { color: colors.textMain, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', marginRight: 30 },
  mainPrompt: { color: colors.textMain, fontSize: 16, textAlign: 'center', marginBottom: 30, fontWeight: '500' },
  label: { color: colors.textSub, fontSize: 14, marginBottom: 8, marginTop: 10 },
  pickerContainer: {
    backgroundColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    height: 55,
    justifyContent: 'center'
  },
  inputWrapper: { width: '100%' },
  input: {
    backgroundColor: colors.border,
    color: colors.textMain,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    height: 55,
  },
  publishBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  publishText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

const getPickerStyles = (colors) => ({
  inputIOS: { color: colors.textMain, paddingHorizontal: 15, fontSize: 16, height: 55 },
  inputAndroid: { color: colors.textMain, paddingHorizontal: 15, fontSize: 16, height: 55 },
  iconContainer: { top: 15, right: 12 }
});

export default JobsPost3;