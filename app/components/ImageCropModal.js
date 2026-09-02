import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

export default function ImageCropModal({ visible, imageUri, aspect = 1, onCancel, onConfirm }) {
  const insets = useSafeAreaInsets();
  const [imgDims, setImgDims] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const box = useMemo(() => {
    const maxW = SCREEN_W - 32;
    const maxH = SCREEN_H * 0.55;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return { w, h };
  }, [aspect]);

  useEffect(() => {
    if (visible && imageUri) {
      setOffset({ x: 0, y: 0 });
      setImgDims(null);
      Image.getSize(
        imageUri,
        (w, h) => setImgDims({ width: w, height: h }),
        () => setImgDims(null)
      );
    }
  }, [visible, imageUri]);

  const scale = useMemo(() => {
    if (!imgDims) return null;
    return Math.max(box.w / imgDims.width, box.h / imgDims.height);
  }, [imgDims, box]);

  const rendered = useMemo(() => {
    if (!imgDims || !scale) return null;
    return { width: imgDims.width * scale, height: imgDims.height * scale };
  }, [imgDims, scale]);

  const panResponder = useMemo(() => {
    if (!rendered) return PanResponder.create({});
    const maxX = Math.max(0, (rendered.width - box.w) / 2);
    const maxY = Math.max(0, (rendered.height - box.h) / 2);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        setOffset({
          x: Math.max(-maxX, Math.min(maxX, g.dx)),
          y: Math.max(-maxY, Math.min(maxY, g.dy)),
        });
      },
      onPanResponderRelease: () => {},
    });
  }, [rendered, box]);

  const cropRegion = useMemo(() => {
    if (!imgDims || !scale || !rendered) return null;
    const left = (box.w - rendered.width) / 2 + offset.x;
    const top = (box.h - rendered.height) / 2 + offset.y;
    const imgLeft = Math.max(0, -left);
    const imgTop = Math.max(0, -top);
    const imgWidth = Math.min(box.w, rendered.width - imgLeft);
    const imgHeight = Math.min(box.h, rendered.height - imgTop);
    return {
      originX: Math.round(imgLeft / scale),
      originY: Math.round(imgTop / scale),
      width: Math.round(imgWidth / scale),
      height: Math.round(imgHeight / scale),
    };
  }, [imgDims, scale, rendered, box, offset]);

  const handleConfirm = async () => {
    if (!cropRegion) return;
    setProcessing(true);
    try {
      const result = await manipulateAsync(imageUri, [{ crop: cropRegion }], {
        compress: 0.9,
        format: SaveFormat.JPEG,
      });
      onConfirm(result.uri);
    } catch (e) {
      console.error('Kırpma hatası:', e);
    } finally {
      setProcessing(false);
    }
  };

  if (!visible || !rendered) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
        <View style={styles.backdrop}>
          <ActivityIndicator color="#FFF" size="large" />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onCancel} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="close" size={26} color="#FFF" />
          </Pressable>
          <Text style={styles.title}>Fotoğrafı Sürükleyin</Text>
          <Pressable onPress={handleConfirm} style={styles.headerBtn} hitSlop={8} disabled={processing}>
            {processing ? <ActivityIndicator color="#FFF" /> : <Ionicons name="checkmark" size={26} color="#FFF" />}
          </Pressable>
        </View>

        <View style={styles.body} {...panResponder.panHandlers}>
          <View style={[styles.cropBox, { width: box.w, height: box.h }]}>
            <Image
              source={{ uri: imageUri }}
              style={{
                width: rendered.width,
                height: rendered.height,
                position: 'absolute',
                left: (box.w - rendered.width) / 2 + offset.x,
                top: (box.h - rendered.height) / 2 + offset.y,
              }}
            />
          </View>
        </View>

        <Text style={styles.hint}>Fotoğrafı sürükleyerek kırpılacak alanı seçin</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { padding: 4 },
  title: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cropBox: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: '#000',
  },
  hint: {
    color: '#AAA',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});