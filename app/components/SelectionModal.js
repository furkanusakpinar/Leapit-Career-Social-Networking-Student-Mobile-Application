import { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SelectionModal = ({ isVisible, onClose, onSelectOption, userId, currentRouteName }) => {
    const themeMode = useSelector(state => state.theme?.mode || 'dark');
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);

    const [modalVisible, setModalVisible] = useState(false);
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOpacity = useSharedValue(0);

    const handleOptionPress = (option) => {
        onSelectOption(option.name);
    };

    useEffect(() => {
        if (isVisible) {
            setModalVisible(true);
            translateY.value = withTiming(0, { duration: 250 });
            backdropOpacity.value = withTiming(1, { duration: 300 });
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
            backdropOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
                if (finished) {
                    runOnJS(setModalVisible)(false);
                }
            });
        }
    }, [isVisible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }]
        };
    });

    const backdropAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: backdropOpacity.value
        };
    });

    const gestureHandler = (event) => {
        if (event.nativeEvent.translationY > 0) {
            translateY.value = event.nativeEvent.translationY;
        }
    };

    const gestureEnd = () => {
        if (translateY.value > 150) {
            runOnJS(onClose)();
        } else {
            translateY.value = withTiming(0, { duration: 250 });
        }
    };

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={modalVisible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
                    <Pressable style={styles.backdrop} onPress={onClose} />
                </Animated.View>

                <PanGestureHandler onGestureEvent={gestureHandler} onEnded={gestureEnd}>
                    <Animated.View style={[styles.bottomSheetContainer, animatedStyle]}>
                        <View style={styles.modalInnerContainer}>
                            <View style={styles.modalContent}>
                                <View style={styles.handleBar} />
                                <Pressable
                                    style={styles.optionRow}
                                    activeOpacity={0.7}
                                    onPress={() => handleOptionPress({ name: 'Gönderi', screen: 'PhotoSharePage', params: { userId: userId, previousScreen: currentRouteName } })}
                                >
                                    <Image source={require('../../assets/images/Post.png')} style={[styles.choiceIcon, { tintColor: colors.textSub }]} />
                                    <Text style={styles.optionText}>Gönderi</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.optionRow}
                                    activeOpacity={0.7}
                                    onPress={() => handleOptionPress({ name: 'Proje', screen: 'ProjectPage' })}
                                >
                                    <Image source={require('../../assets/images/project.png')} style={[styles.choiceIcon, { tintColor: colors.textSub }]} />
                                    <Text style={styles.optionText}>Proje</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.optionRow}
                                    activeOpacity={0.7}
                                    onPress={() => handleOptionPress({ name: 'İş İlanı', screen: 'JobsPostingPage' })}
                                >
                                    <Image source={require('../../assets/images/IsIlanlari.png')} style={[styles.choiceIcon, { tintColor: colors.textSub }]} />
                                    <Text style={styles.optionText}>İş İlanı</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.endOptionRow}
                                    activeOpacity={0.7}
                                    onPress={() => handleOptionPress({ name: 'Blog', screen: 'BlogPage' })}
                                >
                                    <Image source={require('../../assets/images/Blog.png')} style={[styles.choiceIcon, { tintColor: colors.textSub }]} />
                                    <Text style={styles.optionText}>Blog</Text>
                                </Pressable>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.cancelButton} activeOpacity={0.7} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Vazgeç</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </PanGestureHandler>
            </View>
        </Modal>
    );
};

const getStyles = (colors) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bottomSheetContainer: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    modalInnerContainer: {
        width: '95%',
        alignSelf: 'center',
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        paddingVertical: 8,
        borderRadius: 25,
        borderColor: colors.border,
        borderWidth: 1,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 15,
        paddingBottom: 10,
    },
    optionRow: {
        flexDirection: 'row',
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    endOptionRow: {
        flexDirection: 'row',
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    choiceIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        marginRight: 12,
    },
    optionText: {
        color: colors.textMain,
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: colors.cardBackground,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: Platform.OS === 'ios' ? 34 : 15,
        borderRadius: 15,
        marginHorizontal: 10,
        borderColor: colors.border,
        borderWidth: 1,
        width: '95%',
        alignSelf: 'center'
    },
    cancelButtonText: {
        color: '#FF4B4B',
        fontSize: 18,
        fontWeight: 'bold',
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: colors.border,
        borderRadius: 10,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 4,
    }
});

export default SelectionModal;