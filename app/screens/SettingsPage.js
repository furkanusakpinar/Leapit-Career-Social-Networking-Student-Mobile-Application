import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { db } from "../../firebaseConfig";
import { toggleTheme } from "../redux/themeSlice";
import { logoutUser } from "../redux/userSlice";
import { darkTheme, lightTheme } from "../theme/colors";
import { deleteUserData } from "../utils/deleteUser";

const settingsOptions = [
  "Ad, konum ve sektörü düzenle",
  "Kişisel demografik bilgiler",
];

const settingsOptions2 = [
  "Bildirim ayarları",
  "Gizlilik ayarları",
  "Tema Değiştir",
  "Oturumu Kapat",
  "Hesabı Sil",
  "Yardım ve destek",
];

const SettingsPage = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const userId = useSelector((state) => state.user.userId);
  const themeMode = useSelector((state) => state.theme?.mode || "dark");
  const colors = themeMode === "light" ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, "Users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        console.log("Kullanıcı verisi bulunamadı!");
      }
    } catch (e) {
      console.error("Kullanıcı verisi çekilirken hata:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchSavedData = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Kaydedilen postları Users/{userId}/saves koleksiyonundan çek
      const savesSnap = await getDocs(collection(db, "Users", userId, "saves"));

      // Kayıtlı post ID'lerini al
      const savedPostIds = savesSnap.docs.map(doc => doc.id);

      if (savedPostIds.length > 0) {
          // Postları Firebase'den tek tek veya toplu çekmemiz gerekiyor.
          // Basitlik için burada örnek bir yöntem (postId listesi ile):
          // Not: Firestore'da 'in' sorgusu ile max 30 ID çekilebilir.
          const postsRef = collection(db, "Posts");
          // Not: Buradaki sorgu basit olduğu için composite index istemeyecektir.
          const postsSnap = await getDocs(query(postsRef, where("__name__", "in", savedPostIds)));

          const postsData = postsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSavedPosts(postsData);
      } else {
          setSavedPosts([]);
      }

      // Kaydedilen işleri benzer şekilde Jobs koleksiyonundan çek
      // (Burası mevcut yapınızda Jobs koleksiyonuyla nasıl çalışıyorsa öyle kalmalı)
    } catch (e) {
      console.error("Kaydedilen veriler çekilirken hata:", e);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
    fetchSavedData();
  }, [fetchUser, fetchSavedData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUser().then(() => setRefreshing(false));
  }, [fetchUser]);
  const handleLogout = async () => {
    setShowLogoutModal(false);
    await AsyncStorage.multiRemove(["userToken", "userId", "userCredentials", "rememberMe", "isBiometricEnabled"]);
    dispatch(logoutUser());
    navigation.replace("Login");
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Hesabı Sil",
      "Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      [
        {
          text: "İptal",
          style: "cancel",
        },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteUserData(userId);
              await AsyncStorage.multiRemove(["userToken", "userId", "userCredentials", "rememberMe", "isBiometricEnabled"]);
              dispatch(logoutUser());
              navigation.replace("Login");
            } catch (error) {
              console.error("Hesap silinirken hata:", error);
              Alert.alert(
                "Hata",
                "Hesap silinirken bir sorun oluştu. Lütfen tekrar deneyin.",
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading || isDeleting) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {isDeleting ? "Hesabınız siliniyor..." : "Yükleniyor..."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={themeMode === "light" ? "dark-content" : "light-content"}
        translucent
        backgroundColor="transparent"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textMain}
            />
          }
        >
          {}
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.iconButton}
            >
              <Image
                source={require("../../assets/images/back.png")}
                style={styles.backIcon}
              />
            </Pressable>
            <Text style={styles.headerTitle}>Ayarlar</Text>
            <Pressable
              onPress={() => setShowLogoutModal(true)}
              style={styles.iconButton}
            >
              <Image
                source={require("../../assets/images/LogOut.png")}
                style={styles.logoutIcon}
              />
            </Pressable>
          </View>

          {}
          <View style={styles.profileHeader}>
            <Image
              source={
                userData?.profileImageUrl
                  ? { uri: userData.profileImageUrl }
                  : require("../../assets/images/ProfileSquare.png")
              }
              style={styles.profileImage}
            />
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>
                {userData?.fullName || "İsimsiz"}
              </Text>
              <Text style={styles.profileJob}>
                {userData?.profession || "Meslek yok"}
              </Text>
            </View>
          </View>

          {}
          {[settingsOptions, settingsOptions2].map((group, gi) => (
            <View key={gi} style={[styles.card, gi === 1 && { marginTop: 20 }]}>
              <Text style={styles.cardHeader}>
                {gi === 0 ? "Hesap Ayarları" : "Diğer Ayarlar"}
              </Text>
              {group.map((option, idx) => (
                <View key={idx}>
                  <Pressable
                    style={styles.rowBetween}
                    onPress={() => {
                      if (option === "Oturumu Kapat") setShowLogoutModal(true);
                      else if (option === "Tema Değiştir")
                        dispatch(toggleTheme());
                      else if (option === "Hesabı Sil") handleDeleteAccount();
                    }}
                  >
                    <Text style={styles.optionText}>
                      {option === "Tema Değiştir"
                        ? `Tema Değiştir (${themeMode === "light" ? "Açık" : "Koyu"})`
                        : option}
                    </Text>
                    <Image
                      source={require("../../assets/images/Arrow.png")}
                      style={styles.arrowIcon}
                    />
                  </Pressable>
                  {idx < group.length - 1 && <View style={styles.separator} />}
                </View>
              ))}

              {}
              {gi === 1 &&
                (userData?.email === "leapitapp@gmail.com" ||
                  userData?.isAdmin) && (
                  <>
                    <View style={styles.separator} />
                    <Pressable
                      style={styles.rowBetween}
                      onPress={() => navigation.navigate("AdminJobsList")}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: colors.primary, fontWeight: "bold" },
                        ]}
                      >
                        İş İlanı Onayları
                      </Text>
                      <Image
                        source={require("../../assets/images/Arrow.png")}
                        style={styles.arrowIcon}
                      />
                    </Pressable>
                  </>
                )}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {}
      <Modal
        animationType="fade"
        transparent
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Oturumu Kapat</Text>
            <Text style={styles.modalMessage}>
              Oturumu kapatmak istediğinizden emin misiniz?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.buttonText}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Text style={styles.buttonText}>Çıkış Yap</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    },
    centerContent: {
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: colors.textMain,
      fontSize: 16,
      marginTop: 10,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      height: 50,
      marginBottom: 10,
    },
    headerTitle: {
      fontSize: 20,
      color: colors.textMain,
      fontWeight: "bold",
    },
    iconButton: {
      padding: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    backIcon: {
      width: 24,
      height: 24,
      resizeMode: "contain",
      tintColor: colors.iconTint,
    },
    logoutIcon: {
      width: 24,
      height: 24,
      resizeMode: "contain",
      tintColor: colors.iconTint,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 20,
      paddingHorizontal: 8,
    },
    profileImage: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.border,
    },
    profileTextContainer: {
      marginLeft: 15,
    },
    profileName: {
      fontSize: 18,
      color: colors.textMain,
      fontWeight: "bold",
    },
    profileJob: {
      fontSize: 13,
      color: colors.textSub,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      color: colors.textSub,
      fontWeight: "600",
      fontSize: 17,
      marginBottom: 12,
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
    },
    optionText: {
      color: colors.textMain,
      fontSize: 15,
    },
    arrowIcon: {
      width: 14,
      height: 14,
      resizeMode: "contain",
      opacity: 0.5,
      tintColor: colors.iconTint,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 5,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.75)",
    },
    modalContainer: {
      width: "80%",
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: "center",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textMain,
      marginBottom: 8,
    },
    modalMessage: {
      fontSize: 14,
      color: colors.textSub,
      textAlign: "center",
      marginBottom: 24,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    logoutButton: {
      backgroundColor: "#dc3545",
    },
    buttonText: {
      color: colors.textMain,
      fontWeight: "600",
    },
  });

export default SettingsPage;
