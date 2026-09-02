import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import moment from 'moment';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { db } from '../../firebaseConfig';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ActionSheet = ({ visible, onClose, children, keyboardEnabled, onKeyboardHeightChange }) => {
    const [mounted, setMounted] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
        if (!keyboardEnabled) return;
        const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
            const h = e.endCoordinates?.height || 0;
            setKeyboardHeight(h);
            onKeyboardHeightChange?.(h);
        });
        const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
            setKeyboardHeight(0);
            onKeyboardHeightChange?.(0);
        });
        return () => {
            show.remove();
            hide.remove();
        };
    }, [keyboardEnabled]);

    useEffect(() => {
        if (visible) {
            setMounted(true);
            translateY.value = withTiming(-keyboardHeight, { duration: 250 });
            backdropOpacity.value = withTiming(1, { duration: 300 });
        } else if (mounted) {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
            backdropOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
                if (finished) runOnJS(setMounted)(false);
            });
        }
    }, [visible]);

    useEffect(() => {
        if (mounted && visible) {
            translateY.value = withTiming(-keyboardHeight, { duration: 150 });
        }
    }, [keyboardHeight]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const gestureHandler = (e) => {
        if (e.nativeEvent.translationY > 0) {
            translateY.value = -keyboardHeight + e.nativeEvent.translationY;
        }
    };

    const gestureEnd = () => {
        if (translateY.value > 150 - keyboardHeight) {
            runOnJS(onClose)();
        } else {
            translateY.value = withTiming(-keyboardHeight, { duration: 250 });
        }
    };

    if (!visible && !mounted) return null;

    return (
        <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }, backdropStyle]}>
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>
                <PanGestureHandler onGestureEvent={gestureHandler} onEnded={gestureEnd}>
                    <Animated.View style={[{ width: '100%', justifyContent: 'flex-end' }, animatedStyle]}>
                        {children}
                    </Animated.View>
                </PanGestureHandler>
            </View>
        </Modal>
    );
};

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
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const availableHeight = keyboardHeight > 0 ? SCREEN_HEIGHT - keyboardHeight - 120 : SCREEN_HEIGHT * 0.6;

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
        <ActionSheet visible={visible} onClose={() => { onClose(); setReplyingTo(null); }} keyboardEnabled onKeyboardHeightChange={setKeyboardHeight}>
            <View style={[styles.sheetContentWrap, { maxHeight: availableHeight }]}>
                <View style={styles.sheetCard}>
                    <View style={styles.handleBar} />
                    <Text style={styles.sheetTitle}>Yorumlar</Text>
                    <FlatList
                        data={comments}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.commentList}
                        style={styles.commentListStyle}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.emptyComments}>
                                <Text style={styles.emptyCommentsText}>Henüz yorum yok. İlk yorumu sen yap.</Text>
                            </View>
                        }
                    />
                </View>

                <View style={styles.inputCard}>
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
                    <View style={styles.inputRow}>
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
                            maxLength={5000}
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
                </View>
            </View>
        </ActionSheet>
    );
};

const getStyles = (colors) => StyleSheet.create({
    sheetContentWrap: {
        width: '95%',
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetCard: {
        backgroundColor: colors.cardBackground,
        paddingTop: 0,
        borderRadius: 25,
        borderColor: colors.border,
        borderWidth: 1,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 15,
        overflow: 'hidden',
        flexShrink: 1,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: colors.border,
        borderRadius: 10,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 8,
    },
    sheetTitle: {
        color: colors.textMain,
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginHorizontal: 15,
    },
    commentListStyle: {
        flexGrow: 1,
    },
    commentList: {
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    emptyComments: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyCommentsText: {
        color: colors.textSub,
        fontSize: 14,
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
    inputCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 15,
        borderColor: colors.border,
        borderWidth: 1,
        width: '100%',
        marginTop: 10,
        paddingTop: 6,
        paddingBottom: 10,
        flexShrink: 0,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
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
        backgroundColor: colors.background,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 5,
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