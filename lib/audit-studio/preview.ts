/** Small, correctly oriented previews keep a photo-heavy visit usable on phones. Originals remain intact. */
export async function makePreview(file: Blob): Promise<Blob | undefined> {
  if (!file.type.startsWith("image/")) return;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 640 / bitmap.width, 640 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | undefined>((resolve) =>
      canvas.toBlob((blob) => resolve(blob || undefined), "image/jpeg", 0.75),
    );
  } catch {
    return undefined;
  } finally {
    bitmap?.close();
  }
}
