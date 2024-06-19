/**
 * 获取浏览器当前滚动高度
 * @returns 浏览器滚动高度
 */
export function getScrollTop(): number {
  // 检查 window 和 document 是否存在，以处理 SSR 的情况
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0
  }
  // 使用不同的方式获取滚动条高度，以处理浏览器兼容性问题
  if (typeof window.scrollY !== 'undefined') {
    // 支持现代浏览器
    return window.scrollY
  } else if (document.documentElement && document.documentElement.scrollTop) {
    // 兼容IE 6-8
    return document.documentElement.scrollTop
  } else if (document.body && document.body.scrollTop) {
    // 兼容一些老的浏览器
    return document.body.scrollTop
  }
  return 0
}

/**
 * 判断浏览器是否支持现代文件操作
 */
export function isModernFileAPIAvailable() {
  const fileHandleSupported = 'FileSystemHandle' in window
  const openFilePickerSupported = 'showOpenFilePicker' in window
  const saveFilePickerSupported = 'showSaveFilePicker' in window
  const directoryPickerSupported = 'showDirectoryPicker' in window

  return (
    fileHandleSupported &&
    openFilePickerSupported &&
    saveFilePickerSupported &&
    directoryPickerSupported
  )
}

/**
 * 生成随机字符串
 * @param length 长度
 * @returns
 */
export function genRandomString(length: number): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomString = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    randomString += charset.charAt(randomIndex)
  }
  return randomString
}

/**
 * 选择头像图片
 * @param cb 回调
 * @returns
 */
export function selectAvatar(cb: (url: string) => void) {
  if (typeof window === 'undefined') {
    return
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      input.onchange = null
      input.remove()
      createImageBitmap(file)
        .then((img) => {
          // 将图片转256x256的webp格式，节省空间
          const oc = new OffscreenCanvas(256, 256)
          const ctx = oc.getContext('2d')
          if (!ctx) {
            throw new Error('Failed to create context')
          }
          ctx.drawImage(img, 0, 0, 256, 256)
          return oc.convertToBlob({ type: 'image/webp', quality: 0.61 })
        })
        .then((blob) => {
          // 再转换成DataURL方便存储
          const fr = new FileReader()
          fr.onload = () => {
            cb(fr.result + '')
          }
          fr.readAsDataURL(blob)
        })
        .catch(console.warn)
    } else {
      cb('')
      input.onchange = null
      input.remove()
    }
  }
  input.click()
}