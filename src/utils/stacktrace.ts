import type { Frame } from '../types/event'

const LINE = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/

export function parseStack(err: Error): { frames: Frame[] } | undefined {
    if (!err.stack) return undefined
    const lines = err.stack.split('\n').slice(1)
    const frames: Frame[] = []
    for (const line of lines) {
        const m = LINE.exec(line)
        if (!m) continue
        const fn = m[1] || undefined
        const filename = m[2]
        const lineno = parseInt(m[3] ?? '0', 10)
        const colno = parseInt(m[4] ?? '0', 10)
        frames.push({ filename, function: fn, lineno, colno, in_app: true })
    }
    frames.reverse()
    return { frames }
}
