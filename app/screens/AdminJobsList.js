import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const AdminJobsList = () => {
  const navigation = useNavigation();
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  const fetchPendingJobs = async () => {
    try {
      const q = query(
        collection(db, 'JobsPosts'), 
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const jobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingJobs(jobs);
    } catch (error) {
      console.error("Hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <Pressable 
      style={[styles.jobItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} 
      onPress={() => navigation.navigate('JobApproval', { jobId: item.id })}
    >
      <View style={styles.jobInfo}>
        <Text style={[styles.jobTitle, { color: colors.textMain }]}>{item.jobTitle}</Text>
        <Text style={[styles.jobCompany, { color: colors.textSub }]}>{item.company} - {item.jobLocation}</Text>
        <Text style={styles.jobUser}>Yayınlayan: {item.advertiserName}</Text>
      </View>
      <Image source={require('../../assets/images/Arrow.png')} style={[styles.arrow, { tintColor: colors.iconTint }]} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Onay Bekleyen İlanlar</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={pendingJobs}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSub }]}>Bekleyen ilan bulunamadı.</Text>}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  backIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  jobItem: { padding: 16, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: 'bold' },
  jobCompany: { fontSize: 14, marginTop: 4 },
  jobUser: { fontSize: 12, color: '#1D9BF0', marginTop: 4 },
  arrow: { width: 16, height: 16, opacity: 0.3 },
  emptyText: { textAlign: 'center', marginTop: 50 }
});

export default AdminJobsList;
