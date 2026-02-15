import { jest } from '@jest/globals'
import { ObservaSDK } from '../src/sdk'

describe('ObservaSDK integration', () => {
    const originalFetch = global.fetch as any

    afterEach(() => {
        global.fetch = originalFetch
        jest.resetAllMocks()
    })

    test('flujo completo de health + ingest con payload enriquecido', async () => {
        const fetchMock = (jest.fn() as any)
            .mockImplementationOnce(async () => ({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ ok: true }),
            }))
            .mockImplementationOnce(async () => ({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ event_id: 'evt_99' }),
            }))
        global.fetch = fetchMock as any
        const sdk = new ObservaSDK({ apiKey: 'api_1', dsnKey: 'dsn_9', baseUrl: 'http://localhost' })
        const result = await sdk.ingest.event({
            event: {
                level: 'error',
                message: 'boom',
                exception: {
                    type: 'Error',
                    value: 'Timeout',
                    stacktrace: {
                        frames: [{ filename: 'src/a.ts', function: 'f', lineno: 1, colno: 2 }],
                    },
                },
                tags: { service: 'billing' },
                extra: { orderId: 'ord_1' },
            },
            idempotencyKey: 'req_99',
            sdkVersion: '2.0.0',
        })
        expect(result.event_id).toBe('evt_99')
        const [, eventOptions] = (global.fetch as any).mock.calls[1]
        const body = JSON.parse(eventOptions.body)
        expect(body.dsnKey).toBe('dsn_9')
        expect(body.event.exception.type).toBe('Error')
        expect(body.event.tags.service).toBe('billing')
        expect(body.event.extra.orderId).toBe('ord_1')
        expect(eventOptions.headers['x-idempotency-key']).toBe('req_99')
        expect(eventOptions.headers['x-sdk-version']).toBe('2.0.0')
    })
})
