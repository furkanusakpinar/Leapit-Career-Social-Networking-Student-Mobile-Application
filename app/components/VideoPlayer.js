import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Video } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';


const VideoPlayer = ({ videoUri, style, videoStyle, isFocused = false }) => {
  const videoPlayerRef = useRef(null);
  const [playbackStatus, setPlaybackStatus] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeout = useRef(null);

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  
  const hideControls = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000); 
  };

  
  const toggleControls = () => {
    
    if (!isLoading && playbackStatus.isLoaded) {
      setShowControls(prev => !prev);
      hideControls(); 
    }
  };

  
  const handlePlaybackStatusUpdate = (status) => {
    setPlaybackStatus(status);
    if (status.isLoaded && isLoading) {
      setIsLoading(false);
      if (!status.isPlaying && !showControls) {
        setShowControls(true);
        hideControls(); 
      }
    }
    if (!status.isLoaded && !isLoading) {
      setIsLoading(true);
    }
  };

  
  const togglePlayPause = async () => {
    if (videoPlayerRef.current && playbackStatus.isLoaded) {
      if (
        playbackStatus.didJustFinish ||
        playbackStatus.positionMillis === playbackStatus.durationMillis
      ) {
        await videoPlayerRef.current.setPositionAsync(0);
        await videoPlayerRef.current.playAsync();
      } else if (playbackStatus.isPlaying) {
        await videoPlayerRef.current.pauseAsync();
      } else {
        await videoPlayerRef.current.playAsync();
      }
      hideControls();
    }
  };

  
  const formatMillis = (millis) => {
    if (millis === undefined || isNaN(millis)) return '00:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''
      }${seconds}`;
  };

  
  const toggleFullscreen = async () => {
    if (videoPlayerRef.current && playbackStatus.isLoaded) {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
        if (Platform.OS === 'ios' && videoPlayerRef.current.dismissFullscreenPlayer) {
          videoPlayerRef.current.dismissFullscreenPlayer();
        }
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
        );
        if (Platform.OS === 'ios' && videoPlayerRef.current.presentFullscreenPlayer) {
          videoPlayerRef.current.presentFullscreenPlayer();
        }
      }
      setIsFullscreen(!isFullscreen);
      hideControls();
    }
  };

  
  useEffect(() => {
    const handleOrientationChange = ({ orientationInfo }) => {
      if (
        orientationInfo.orientation ===
        ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientationInfo.orientation ===
        ScreenOrientation.Orientation.LANDSCAPE_RIGHT
      ) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false);
      }
      
      setShowControls(true);
      hideControls();
    };

    ScreenOrientation.addOrientationChangeListener(handleOrientationChange);

    return () => {
      ScreenOrientation.removeOrientationChangeListeners();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
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

  return (
    <Pressable
      onPress={toggleControls}
      style={[
        styles.videoPlayerContainer,
        style,
        isFullscreen ? styles.fullscreenContainer : {},
      ]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Video Yükleniyor...</Text>
        </View>
      )}
      <Video
        ref={videoPlayerRef}
        source={videoUri ? { uri: videoUri } : null}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode={isFullscreen ? 'contain' : 'cover'}
        shouldPlay={false}
        isLooping={false}
        useNativeControls={false}
        style={[
          styles.videoElement,
          videoStyle,
          isFullscreen ? styles.fullscreenVideo : {},
        ]}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={(error) => {
          console.error('Video yükleme hatası:', error);
          setIsLoading(false);
        }}
      />
      {}
      {!isLoading && playbackStatus.isLoaded && !playbackStatus.isPlaying && !showControls && (
        <Pressable onPress={togglePlayPause} style={styles.playIconOverlay}>
          <View style={styles.centerPlayButton}>
            <MaterialIcons name="play-arrow" size={36} color="#fff" />
          </View>
        </Pressable>
      )}

      {}
      {!isLoading && playbackStatus.isLoaded && showControls && (
        <View style={styles.controlsOverlay}>
          <Pressable onPress={togglePlayPause} style={styles.controlButton}>
            <MaterialIcons
              name={
                playbackStatus.didJustFinish
                  ? 'replay'
                  : playbackStatus.isPlaying
                    ? 'pause'
                    : 'play-arrow'
              }
              size={24}
              color="#fff"
            />
          </Pressable>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatMillis(playbackStatus.positionMillis)}
            </Text>
            <Text style={styles.timeText}> / </Text>
            <Text style={styles.timeText}>
              {formatMillis(playbackStatus.durationMillis)}
            </Text>
          </View>
          <Slider
            style={styles.progressBar}
            minimumValue={0}
            maximumValue={playbackStatus.durationMillis || 1}
            value={playbackStatus.positionMillis || 0}
            onSlidingComplete={async (value) => {
              if (videoPlayerRef.current) {
                await videoPlayerRef.current.setPositionAsync(value);
              }
              hideControls();
            }}
            minimumTrackTintColor={colors.textMain}
            maximumTrackTintColor={colors.border}
            thumbTintColor="transparent"
          />
        </View>
      )}
    </Pressable>
  );
};

const getStyles = (colors) => StyleSheet.create({
  videoPlayerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: colors.background, 
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
    zIndex: 2,
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
    zIndex: 1,
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(16, 18, 22, 0.75)', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
    flexWrap: 'wrap',
  },
  controlButton: {
    padding: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  timeText: {
    color: colors.textMain,
    fontSize: 10,
    fontWeight: '500',
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 6,
    height: 20, 
  },
  fullscreenButton: {
    padding: 5,
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default VideoPlayer;