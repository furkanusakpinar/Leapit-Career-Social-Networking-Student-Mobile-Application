import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import moment from 'moment';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { db } from '../../firebaseConfig';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CommentItem = ({ item, isReply = false, colors, styles, onReplyPress }) => (
    <View style={[styles.commentItem, isReply && styles.replyItemStyle]}>
        <Image
            source={
                item.profileImageUrl && typeof item.profileImageUrl === 'string' && item.profileImageUrl.length > 0
                    ? { uri: item.profileImageUrl }
                    : require('../../assets/images/ProfileSquare.png')
            }
            style={[styles.commentAvatar, isReply && styles.replyAvatarStyle]}
        />
        <View style={styles.commentContentBox}>
            <View style={styles.commentHeader}>
                <Text style={styles.commentName}>{item.userName}</Text>
                <Text style={styles.commentTime}>{moment(item.createdAt).fromNow()}</Text>
            </View>
            {item.replyToUserName && (
                <Text style={styles.replyContextText}>
                    @{item.replyToUserName}
                </Text>
            )}
            <Text style={styles.commentText}>{item.content}</Text>
            <Pressable onPress={() => onReplyPress(item)} style={styles.replyActionBtn}>
                <Text style={styles.replyActionText}>Yanıtla</Text>
            </Pressable>
        </View>
    </View>
);

const CommentModal = ({ visible, onClose, postId, currentUserId }) => {

    const themeMode = useSelector(state => state.theme?.mode || 'dark');
    const colors = themeMode === 'light' ? lightTheme : darkTheme;
    const styles = getStyles(colors);

    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);

    const [modalVisible, setModalVisible] = useState(false);
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
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
    }, [visible]);

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

    useEffect(() => {
        if (!currentUserId) return;
        const fetchUser = async () => {
            const userSnap = await getDoc(doc(db, 'Users', currentUserId));
            if (userSnap.exists()) {
                setCurrentUserData(userSnap.data());
            }
        };
        fetchUser();
    }, [currentUserId]);

    useEffect(() => {
        if (!postId || !visible) return;

        const postRef = doc(db, 'Posts', postId);

        const unsubscribe = onSnapshot(postRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const postComments = data.comments || [];

                postComments.sort((a, b) => a.createdAt - b.createdAt);

                setComments(postComments);
            }
        });

        return () => unsubscribe();

    }, [postId, visible]);

    const handleAddComment = async () => {

        if (!commentText.trim() || !currentUserId || !currentUserData) return;

        setLoading(true);

        try {

            const newComment = {
                id: Date.now().toString() + Math.random().toString(36).substring(7),
                userId: currentUserId,
                userName: currentUserData.fullName || 'İsimsiz',
                profileImageUrl: currentUserData.profileImageUrl || null,
                content: commentText.trim(),
                createdAt: Date.now(),
                replyToUserName: replyingTo ? replyingTo.userName : null,
                replyToUserId: replyingTo ? replyingTo.userId : null,
                parentId: replyingTo ? (replyingTo.parentId || replyingTo.id) : null,
            };

            const postRef = doc(db, 'Posts', postId);

            await updateDoc(postRef, {
                comments: arrayUnion(newComment)
            });

            setCommentText('');
            setReplyingTo(null);

        } catch (error) {
            console.error("Yorum ekleme hatası:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        if (item.parentId) return null;

        const replies = comments.filter(c => c.parentId === item.id);

        return (
            <View>
                <CommentItem
                    item={item}
                    colors={colors}
                    styles={styles}
                    onReplyPress={setReplyingTo}
                />
                {replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                        {replies.map(reply => (
                            <CommentItem
                                key={reply.id}
                                item={reply}
                                isReply={true}
                                colors={colors}
                                styles={styles}
                                onReplyPress={setReplyingTo}
                            />
                        ))}
                    </View>
                )}
            </View>
        );
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
                    <Animated.View style={[styles.modalContent, animatedStyle]}>
                        <View style={styles.handleBar} />
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Yorumlar</Text>
                        </View>

                        <FlatList
                            data={comments}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.commentList}
                        />

                        {replyingTo && (
                            <View style={styles.replyingToIndicator}>
                                <Text style={styles.replyingToIndicatorText}>
                                    @{replyingTo.userName} kullanıcısına yanıt veriliyor
                                </Text>
                                <Pressable onPress={() => setReplyingTo(null)} style={styles.cancelReplyBtn}>
                                    <Text style={styles.cancelReplyText}>İptal</Text>
                                </Pressable>
                            </View>
                        )}

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 0}
                        >
                            <View style={styles.inputSection}>
                                <Image
                                    source={
                                        currentUserData?.profileImageUrl && typeof currentUserData.profileImageUrl === 'string'
                                            ? { uri: currentUserData.profileImageUrl }
                                            : require('../../assets/images/ProfileSquare.png')
                                    }
                                    style={styles.inputAvatar}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Yorum ekle..."
                                    placeholderTextColor={colors.textSub}
                                    value={commentText}
                                    onChangeText={setCommentText}
                                    multiline
                                />
                                <Pressable
                                    style={[styles.sendBtn, !commentText.trim() && { opacity: 0.5 }]}
                                    onPress={handleAddComment}
                                    disabled={loading || !commentText.trim()}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <Image
                                            source={require('../../assets/images/ArrowRight.png')}
                                            style={styles.sendIcon}
                                        />
                                    )}
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        height: SCREEN_HEIGHT * 0.7,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: colors.border,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 10,
    },
    header: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    headerTitle: {
        color: colors.textMain,
        fontSize: 16,
        fontWeight: 'bold',
    },
    commentList: {
        padding: 15,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    commentContentBox: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    commentName: {
        color: colors.textMain,
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 8,
    },
    commentTime: {
        color: colors.textSub,
        fontSize: 12,
    },
    commentText: {
        color: colors.textMain,
        fontSize: 14,
        lineHeight: 18,
    },
    replyActionBtn: {
        marginTop: 5,
    },
    replyActionText: {
        color: colors.textSub,
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    inputAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: colors.textMain,
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        maxHeight: 100,
    },
    sendBtn: {
        marginLeft: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendIcon: {
        width: 18,
        height: 18,
        tintColor: 'white',
    },
    replyContextText: {
        color: colors.primary,
        fontSize: 12,
        marginBottom: 2,
    },
    replyingToIndicator: {
        backgroundColor: colors.cardBackground,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 5,
    },
    replyingToIndicatorText: {
        color: colors.textSub,
        fontSize: 12,
    },
    cancelReplyBtn: {
        padding: 5,
    },
    cancelReplyText: {
        color: '#FF4B4B',
        fontSize: 14,
        fontWeight: 'bold',
    },
    repliesContainer: {
        marginLeft: 40,
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
        paddingLeft: 10,
        marginTop: -5,
    },
    replyItemStyle: {
        marginBottom: 10,
    },
    replyAvatarStyle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginTop: 4,
    }
});

export default CommentModal;