import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';
import { useNavigation, useRoute } from '@react-navigation/native';

const SchoolProfilePage = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { schoolId, schoolName } = route.params || {};

    const themeMode = useSelector(state => state.theme?.mode || 'dark');
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()}>
                    <Image source={require('../../assets/images/back.png')} style={styles.back} />
                </Pressable>
                <Text style={styles.title}>{schoolName || 'Okul Profili'}</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={styles.content}>
                <Text style={styles.text}>Okul ID: {schoolId}</Text>
                <Text style={styles.text}>Bu sayfa yapım aşamasındadır.</Text>
            </View>
        </SafeAreaView>
    );
};

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginTop: 10 },
  back: { width: 24, height: 24, resizeMode: 'contain', tintColor: colors.iconTint },
    title: { color: colors.textMain, fontSize: 20, fontWeight: 'bold' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { color: colors.textSub, fontSize: 16, marginTop: 10 },
});

export default SchoolProfilePage;
