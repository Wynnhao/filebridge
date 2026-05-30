/**
 * 纯 JS 二维码生成器
 * 使用轻量级 QR 码算法（Worker 体积友好）
 * 返回 base64 PNG 格式的二维码图片
 */

/** QR 码矩阵 → SVG 字符串（更轻量，避免 PNG 编码复杂度） */
export function generateQRCodeSvg(text: string, size = 200): string {
  // 使用 QR 码数据矩阵生成 SVG
  const matrix = createQRMatrix(text)
  if (!matrix) {
    // fallback：返回带文字的占位 SVG
    return createFallbackSvg(text, size)
  }

  const n = matrix.length
  const cellSize = size / (n + 8) // 4 单元静区 * 2
  const quietZone = cellSize * 4
  const totalSize = size

  const cells: string[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = quietZone + c * cellSize
        const y = quietZone + r * cellSize
        cells.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}"/>`)
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">
  <rect width="100%" height="100%" fill="white"/>
  <g fill="black">${cells.join('')}</g>
</svg>`
}

/** 生成二维码 data URL（SVG 格式） */
export function generateQRCodeDataUrl(text: string, size = 200): string {
  const svg = generateQRCodeSvg(text, size)
  const encoded = btoa(unescape(encodeURIComponent(svg)))
  return `data:image/svg+xml;base64,${encoded}`
}

function createFallbackSvg(text: string, size: number): string {
  const short = text.length > 40 ? text.slice(0, 40) + '...' : text
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="white" stroke="#ccc" stroke-width="1"/>
  <text x="50%" y="50%" text-anchor="middle" font-size="10" fill="#666">${short}</text>
</svg>`
}

// ─── QR 码核心算法（精简版，仅支持字节模式 + L 纠错级别）─────────────────────

const QR_VERSIONS = [
  // [version, total_codewords, ec_codewords_per_block, blocks]
  [1, 26, 7, 1],
  [2, 44, 10, 1],
  [3, 70, 15, 1],
  [4, 100, 20, 2],
  [5, 134, 26, 2],
  [6, 172, 18, 2],
  [7, 196, 20, 4],
] as const

function createQRMatrix(text: string): boolean[][] | null {
  try {
    const data = new TextEncoder().encode(text)
    const len = data.length

    // 选择版本（仅支持到 v7 的 L 级别，约 89 字节）
    let version = 0
    let dataCapacity = 0
    for (const [v, total, ecPerBlock, blocks] of QR_VERSIONS) {
      const dataCodewords = total - ecPerBlock * blocks
      if (len <= dataCodewords - 3) { // -3 for mode + length indicators
        version = v
        dataCapacity = dataCodewords
        break
      }
    }
    if (version === 0) return null // 文本太长

    const size = version * 4 + 17
    const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false))
    const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false))

    // 放置 finder patterns（定位图案）
    placeFinder(matrix, reserved, 0, 0)
    placeFinder(matrix, reserved, 0, size - 7)
    placeFinder(matrix, reserved, size - 7, 0)

    // 放置 timing patterns（时序图案）
    for (let i = 8; i < size - 8; i++) {
      const v = i % 2 === 0
      if (!reserved[6][i]) { matrix[6][i] = v; reserved[6][i] = true }
      if (!reserved[i][6]) { matrix[i][6] = v; reserved[i][6] = true }
    }

    // 放置 format info 区域（预留）
    placeFormatReserved(reserved, size)

    // 构建数据位流
    const bits = buildDataBits(data, dataCapacity)

    // 放置数据（按照 QR 规范的 Z 形路径）
    placeData(matrix, reserved, bits, size)

    // 应用掩码 0（最简单的掩码模式）
    applyMask(matrix, reserved, size, 0)

    // 写入格式信息（L 级 + mask 0 = 格式码 0x77C4）
    placeFormatInfo(matrix, size, 0x77C4)

    return matrix
  } catch {
    return null
  }
}

function placeFinder(matrix: boolean[][], reserved: boolean[][], row: number, col: number): void {
  const pattern = [
    [true, true, true, true, true, true, true],
    [true, false, false, false, false, false, true],
    [true, false, true, true, true, false, true],
    [true, false, true, true, true, false, true],
    [true, false, true, true, true, false, true],
    [true, false, false, false, false, false, true],
    [true, true, true, true, true, true, true],
  ]
  const size = matrix.length
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = row + r
      const mc = col + c
      if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue
      reserved[mr][mc] = true
      if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
        matrix[mr][mc] = pattern[r][c]
      } else {
        matrix[mr][mc] = false
      }
    }
  }
}

function placeFormatReserved(reserved: boolean[][], size: number): void {
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true
    reserved[i][8] = true
  }
  reserved[8][size - 8] = true
  reserved[8][size - 7] = true
  reserved[8][size - 6] = true
  reserved[8][size - 5] = true
  reserved[8][size - 4] = true
  reserved[8][size - 3] = true
  reserved[8][size - 2] = true
  reserved[8][size - 1] = true
  for (let i = 0; i < 7; i++) {
    reserved[size - 1 - i][8] = true
  }
}

function buildDataBits(data: Uint8Array, capacity: number): boolean[] {
  const bits: boolean[] = []
  // Mode indicator: 0100 (byte mode)
  bits.push(false, true, false, false)
  // Character count (8 bits for version 1-9)
  const len = data.length
  for (let i = 7; i >= 0; i--) bits.push(Boolean((len >> i) & 1))
  // Data
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) bits.push(Boolean((byte >> i) & 1))
  }
  // Terminator
  for (let i = 0; i < 4 && bits.length < capacity * 8; i++) bits.push(false)
  // Padding to byte boundary
  while (bits.length % 8 !== 0) bits.push(false)
  // Padding codewords
  const padBytes = [0xEC, 0x11]
  let padIdx = 0
  while (bits.length < capacity * 8) {
    const b = padBytes[padIdx % 2]
    for (let i = 7; i >= 0; i--) bits.push(Boolean((b >> i) & 1))
    padIdx++
  }
  return bits
}

function placeData(matrix: boolean[][], reserved: boolean[][], bits: boolean[], size: number): void {
  let bitIdx = 0
  let upward = true
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i
      for (let k = 0; k <= 1; k++) {
        const col = right - k
        if (!reserved[row][col]) {
          matrix[row][col] = bitIdx < bits.length ? bits[bitIdx++] : false
        }
      }
    }
    upward = !upward
  }
}

function applyMask(matrix: boolean[][], reserved: boolean[][], size: number, maskPattern: number): void {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c]) {
        let flip = false
        switch (maskPattern) {
          case 0: flip = (r + c) % 2 === 0; break
          case 1: flip = r % 2 === 0; break
          case 2: flip = c % 3 === 0; break
          case 3: flip = (r + c) % 3 === 0; break
          case 4: flip = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break
          case 5: flip = (r * c) % 2 + (r * c) % 3 === 0; break
          case 6: flip = ((r * c) % 2 + (r * c) % 3) % 2 === 0; break
          case 7: flip = ((r + c) % 2 + (r * c) % 3) % 2 === 0; break
        }
        if (flip) matrix[r][c] = !matrix[r][c]
      }
    }
  }
}

function placeFormatInfo(matrix: boolean[][], size: number, formatBits: number): void {
  const bits: boolean[] = []
  for (let i = 14; i >= 0; i--) bits.push(Boolean((formatBits >> i) & 1))

  // Around top-left finder
  const positions1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ]
  for (let i = 0; i < 15; i++) {
    const [r, c] = positions1[i]
    matrix[r][c] = bits[i]
  }
  // Dark module
  matrix[size - 8][8] = true

  // Horizontal (bottom-left) and vertical (top-right)
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = bits[i]
    matrix[8][size - 8 + i] = bits[7 + i]
  }
}
