import {
  cacheDirectory,
  EncodingType,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

const API_KEY = process.env.EXPO_PUBLIC_REMOVEBG_API_KEY;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Removes the background from an image URI.
 * Requires EXPO_PUBLIC_REMOVEBG_API_KEY in .env.
 * Falls back to the original URI if no API key is set.
 * Returns a local file:// URI with the processed PNG.
 */
export async function removeBackground(imageUri: string): Promise<string> {
  if (!API_KEY) {
    console.warn("No EXPO_PUBLIC_REMOVEBG_API_KEY set — skipping background removal");
    return imageUri;
  }

  const base64Image = await readAsStringAsync(imageUri, {
    encoding: EncodingType.Base64,
  });

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify({
      image_file_b64: base64Image,
      size: "auto",
      format: "png",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Background removal failed: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const processedBase64 = arrayBufferToBase64(arrayBuffer);
  const outUri = `${cacheDirectory}clothing_${Date.now()}.png`;

  await writeAsStringAsync(outUri, processedBase64, {
    encoding: EncodingType.Base64,
  });

  return outUri;
}
