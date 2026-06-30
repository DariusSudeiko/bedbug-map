export interface StripOptions {
  /** Longest side in px; larger images are downscaled. */
  maxDim?: number
  /** JPEG quality 0..1. */
  quality?: number
}

/**
 * Re-encodes an image through a <canvas>, which discards ALL metadata — including
 * EXIF GPS coordinates (constraint: raw photos leak the uploader's location).
 * Also downscales very large images. Returns a fresh JPEG blob with no metadata.
 */
export async function stripExifToJpeg(file: File, opts: StripOptions = {}): Promise<Blob> {
  const maxDim = opts.maxDim ?? 1600
  const quality = opts.quality ?? 0.85

  // `imageOrientation: 'from-image'` bakes in EXIF rotation before we drop the metadata.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not supported in this browser')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob) throw new Error('Could not process the image')
    return blob
  } finally {
    bitmap.close()
  }
}
