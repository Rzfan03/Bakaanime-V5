import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export const isNative = () => Capacitor.isNativePlatform();

// Ambil gambar dari kamera/galeri native → data URL base64 (native sudah resize
// sesuai `width`). Di web pakai <input type=file> (lihat Profile.tsx).
export async function pickNativeImage(maxWidth: number): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      width: maxWidth,
      correctOrientation: true,
    });
    return photo.base64String
      ? `data:image/${photo.format};base64,${photo.base64String}`
      : null;
  } catch {
    return null; // dibatalkan user / izin ditolak
  }
}
