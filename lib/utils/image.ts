const MAX_LONG_EDGE = 1200

export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  let targetWidth = width
  let targetHeight = height

  if (width > MAX_LONG_EDGE || height > MAX_LONG_EDGE) {
    if (width >= height) {
      targetWidth = MAX_LONG_EDGE
      targetHeight = Math.round((height / width) * MAX_LONG_EDGE)
    } else {
      targetHeight = MAX_LONG_EDGE
      targetWidth = Math.round((width / height) * MAX_LONG_EDGE)
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to compress image')),
      'image/jpeg',
      0.85
    )
  })
}
