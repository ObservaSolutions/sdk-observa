import { randomUUID, randomBytes } from 'node:crypto'

export function uuid4(): string {
    if (typeof randomUUID === 'function') return randomUUID();

    const tmp = randomBytes?.(16)
    const bytes: Uint8Array = tmp ?? new Uint8Array(16)
    ;(globalThis as any).crypto?.getRandomValues?.(bytes)
    const b6 = bytes[6] ?? 0
    bytes[6] = (b6 & 0x0f) | 0x40
    const b8 = bytes[8] ?? 0
    bytes[8] = (b8 & 0x3f) | 0x80

    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}