import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Video } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const CONTROLS_HIDE_MS = 3200;

const formatMillis = (millis) => {
  if (millis === undefined || isNaN(millis)) return '00:00';
  const totalSeconds = Math.floor(millis / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes < 10 ? '0' + minutes : String(minutes);
  const ss = seconds < 10 ? '0' + seconds : String(seconds);
  return hours > 0
    ? `${hours}:${mm}:${ss}`
    : `${mm}:${ss}`;
};

const VideoPlayer = ({ videoUri, style, videoStyle, isFocused = false, onPress, resizeMode = 'cover' }) => {
  const videoPlayerRef = useRef(null);
  const [playbackStatus, setPlaybackStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsTimeout = useRef(null);

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

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
    if (!isLoading && playbackStatus.isLoaded) {
      setShowControls(prev => {
        const next = !prev;
        animateControls(next);
        return next;
      });
      hideControls();
    }
  }, [animateControls, hideControls, isLoading, playbackStatus.isLoaded]);

  const handlePlaybackStatusUpdate = useCallback((status) => {
    setPlaybackStatus(status);
    if (status.isLoaded) {
      setIsLoading(false);
      setIsBuffering(!!status.isBuffering);
      if (!status.isPlaying && !status.didJustFinish && !showControls) {
        showControlsAnimated();
      }
    } else if (!status.isLoaded) {
      setIsLoading(true);
    }
  }, [showControls, showControlsAnimated]);

  const togglePlayPause = useCallback(async () => {
    if (!videoPlayerRef.current || !playbackStatus.isLoaded) return;
    if (playbackStatus.didJustFinish) {
      await videoPlayerRef.current.setPositionAsync(0);
      await videoPlayerRef.current.playAsync();
    } else if (playbackStatus.isPlaying) {
      await videoPlayerRef.current.pauseAsync();
      showControlsAnimated();
    } else {
      await videoPlayerRef.current.playAsync();
    }
    hideControls();
  }, [hideControls, playbackStatus, showControlsAnimated]);

  const toggleMute = useCallback(async () => {
    if (!videoPlayerRef.current) return;
    const next = !isMuted;
    await videoPlayerRef.current.setIsMutedAsync(next);
    setIsMuted(next);
  }, [isMuted]);

  const seekTo = useCallback(async (positionMillis) => {
    if (!videoPlayerRef.current) return;
    await videoPlayerRef.current.setPositionAsync(positionMillis);
  }, []);

  useEffect(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (videoPlayerRef.current) {
      if (isFocused) {
        videoPlayerRef.current.playAsync();
      } else {
        videoPlayerRef.current.pauseAsync();
      }
    }
  }, [isFocused]);

  const isFinished = playbackStatus.didJustFinish || (
    playbackStatus.isLoaded &&
    playbackStatus.positionMillis > 0 &&
    playbackStatus.positionMillis === playbackStatus.durationMillis
  );

  return (
    <Pressable
      onPress={onPress || toggleControls}
      style={[styles.videoPlayerContainer, style]}
    >
      <Video
        ref={videoPlayerRef}
        source={videoUri ? { uri: videoUri } : null}
        rate={1.0}
        volume={1.0}
        isMuted={isMuted}
        resizeMode={resizeMode}
        shouldPlay={false}
        isLooping={false}
        useNativeControls={false}
        style={[styles.videoElement, videoStyle]}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={(error) => {
          console.error('Video yükleme hatası:', error);
          setIsLoading(false);
        }}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Video Yükleniyor...</Text>
        </View>
      )}

      {isBuffering && !isLoading && (
        <View pointerEvents="none" style={styles.bufferingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {!isLoading && playbackStatus.isLoaded && !playbackStatus.isPlaying && !showControls && (
        <Pressable onPress={togglePlayPause} style={styles.playIconOverlay}>
          <View style={styles.centerPlayButton}>
            <MaterialIcons name={isFinished ? 'replay' : 'play-arrow'} size={40} color="#fff" />
          </View>
        </Pressable>
      )}

      {!isLoading && playbackStatus.isLoaded && showControls && (
        <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]} pointerEvents="box-none">
          <View style={styles.controlsRow}>
            <Pressable onPress={togglePlayPause} style={styles.controlButton} hitSlop={8}>
              <MaterialIcons
                name={isFinished ? 'replay' : playbackStatus.isPlaying ? 'pause' : 'play-arrow'}
                size={30}
                color="#fff"
              />
            </Pressable>

            <Text style={styles.timeText}>{formatMillis(playbackStatus.positionMillis)}</Text>

            <Slider
              style={styles.progressBar}
              minimumValue={0}
              maximumValue={playbackStatus.durationMillis || 1}
              value={playbackStatus.positionMillis || 0}
              onValueChange={(value) => setPlaybackStatus(prev => ({ ...prev, positionMillis: value }))}
              onSlidingStart={() => {
                if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
              }}
              onSlidingComplete={async (value) => {
                await seekTo(value);
                hideControls();
              }}
              minimumTrackTintColor="#ffffff"
              maximumTrackTintColor="rgba(255,255,255,0.35)"
              thumbTintColor="#ffffff"
              thumbTouchSize={{ width: 32, height: 32 }}
            />

            <Text style={styles.timeText}>{formatMillis(playbackStatus.durationMillis)}</Text>

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
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 2,
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
