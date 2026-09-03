import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const CONTROLS_HIDE_MS = 3200;

const formatTime = (seconds) => {
  if (seconds === undefined || isNaN(seconds)) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const mm = minutes < 10 ? '0' + minutes : String(minutes);
  const ss = secs < 10 ? '0' + secs : String(secs);
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

const VideoPlayer = ({ videoUri, style, videoStyle, isFocused = false, onPress, resizeMode = 'cover' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsTimeout = useRef(null);
  const isPlayingRef = useRef(false);

  const player = useVideoPlayer(videoUri ? { uri: videoUri } : null, (p) => {
    p.loop = false;
    p.muted = false;
  });

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  useEvent(player, 'timeUpdate', { currentTime: 0, bufferedPosition: 0 });

  useEventListener(player, 'timeUpdate', ({ currentTime: t }) => {
    setCurrentTime(t);
  });

  useEventListener(player, 'playingChange', ({ isPlaying: playing }) => {
    isPlayingRef.current = playing;
    setIsPlaying(playing);
  });

  useEventListener(player, 'playToEnd', () => {
    setIsFinished(true);
    setShowControls(true);
    animateControls(true);
    hideControls();
  });

  useEventListener(player, 'statusChange', (status) => {
    if (status === 'loading') {
      setIsLoading(true);
    } else if (status === 'readyToPlay') {
      setIsLoading(false);
    } else if (status === 'error') {
      console.error('Video yükleme hatası');
      setIsLoading(false);
    }
  });

  useEvent(player, 'sourceLoad', {});

  useEventListener(player, 'sourceLoad', ({ duration: d }) => {
    setDuration(d || 0);
  });

  const animateControls = useCallback((visible) => {
    Animated.timing(controlsOpacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity]);

  const showControlsAnimated = useCallback(() => {
    setShowControls(true);
    animateControls(true);
  }, [animateControls]);

  const hideControls = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
      animateControls(false);
    }, CONTROLS_HIDE_MS);
  }, [animateControls]);

  const toggleControls = useCallback(() => {
    if (!isLoading) {
      setShowControls(prev => {
        const next = !prev;
        animateControls(next);
        return next;
      });
      hideControls();
    }
  }, [animateControls, hideControls, isLoading]);

  const togglePlayPause = useCallback(() => {
    if (!player || isLoading) return;
    if (isFinished) {
      player.currentTime = 0;
      player.play();
      setIsFinished(false);
    } else if (isPlayingRef.current) {
      player.pause();
      showControlsAnimated();
    } else {
      player.play();
    }
    hideControls();
  }, [isLoading, isFinished, player, hideControls, showControlsAnimated]);

  const toggleMute = useCallback(() => {
    if (!player) return;
    const next = !isMuted;
    player.muted = next;
    setIsMuted(next);
  }, [isMuted, player]);

  const seekTo = useCallback((seconds) => {
    if (!player) return;
    player.currentTime = seconds;
  }, [player]);

  useEffect(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!player) return;
    if (isFocused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isFocused, player]);

  return (
    <Pressable
      onPress={onPress || toggleControls}
      style={[styles.videoPlayerContainer, style]}
    >
      <VideoView
        player={player}
        style={[styles.videoElement, videoStyle]}
        contentFit={resizeMode}
        nativeControls={false}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Video Yükleniyor...</Text>
        </View>
      )}

      {!isLoading && !isPlaying && !showControls && (
        <Pressable onPress={togglePlayPause} style={styles.playIconOverlay}>
          <View style={styles.centerPlayButton}>
            <MaterialIcons name={isFinished ? 'replay' : 'play-arrow'} size={40} color="#fff" />
          </View>
        </Pressable>
      )}

      {!isLoading && showControls && (
        <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]} pointerEvents="box-none">
          <View style={styles.controlsRow}>
            <Pressable onPress={togglePlayPause} style={styles.controlButton} hitSlop={8}>
              <MaterialIcons
                name={isFinished ? 'replay' : isPlaying ? 'pause' : 'play-arrow'}
                size={30}
                color="#fff"
              />
            </Pressable>

            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

            <Slider
              style={styles.progressBar}
              minimumValue={0}
              maximumValue={duration || 1}
              value={currentTime || 0}
              onValueChange={(value) => setCurrentTime(value)}
              onSlidingStart={() => {
                if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
              }}
              onSlidingComplete={(value) => {
                seekTo(value);
                hideControls();
              }}
              minimumTrackTintColor="#ffffff"
              maximumTrackTintColor="rgba(255,255,255,0.35)"
              thumbTintColor="#ffffff"
              thumbTouchSize={{ width: 32, height: 32 }}
            />

            <Text style={styles.timeText}>{formatTime(duration)}</Text>

            <Pressable onPress={toggleMute} style={styles.controlButton} hitSlop={8}>
              <MaterialIcons
                name={isMuted ? 'volume-off' : 'volume-up'}
                size={22}
                color="#fff"
              />
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
};

const getStyles = (colors) => StyleSheet.create({
  videoPlayerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#000000',
    width: '100%',
    height: 220,
  },
  videoElement: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 3,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  centerPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  controlButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 8,
    height: 32,
  },
});

export default VideoPlayer;
