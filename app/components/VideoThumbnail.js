import { MaterialIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, View } from 'react-native';

const VideoThumbnail = ({ videoUri, style, onPress }) => {
  const player = useVideoPlayer(videoUri, (player) => {
    player.pause();
    player.loop = false;
    player.muted = true;
  });

  return (
    <Pressable onPress={onPress} style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.playButton}>
        <MaterialIcons name="play-arrow" size={34} color="#fff" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});

export default VideoThumbnail;
