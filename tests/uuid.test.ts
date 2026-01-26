import { uuid4 } from '../src/utils/uuid'

function toBytes(id: string): number[] {
    const hex = id.replace(/-/g, '')
    const bytes: number[] = []
    for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16))
    return bytes
}

describe('uuid4', () => {
    test('formato y bits de versión/variante correctos', () => {
        const id = uuid4()
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        const bytes = toBytes(id)
        const b6 = bytes[6] ?? 0
        const b8 = bytes[8] ?? 0
        expect(((b6 >> 4) & 0x0f)).toBe(0x04)
        expect((b8 & 0xc0)).toBe(0x80)
    })
})