import { runWithNewScope, getScope, setTag, pushScope, popScope } from '../src/core/scope'

describe('Scope (ALS)', () => {
    test('aislamiento por request con runWithNewScope', () => {
        const before = getScope()
        expect(before.tags['a']).toBeUndefined()

        runWithNewScope({}, () => {
            setTag('a', '1')
            expect(getScope().tags['a']).toBe('1')
        })

        const after = getScope()
        expect(after.tags['a']).toBeUndefined()
    })

    test('pushScope/popScope crean y remueven nested scope', () => {
        runWithNewScope({}, () => {
            setTag('outer', 'x')
            pushScope()
            setTag('inner', 'y')
            expect(getScope().tags['inner']).toBe('y')
            popScope()
            expect(getScope().tags['inner']).toBeUndefined()
            expect(getScope().tags['outer']).toBe('x')
        })
    })
})