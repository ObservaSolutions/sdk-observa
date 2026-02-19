import { jest } from '@jest/globals'
import { ObservaSDK } from '../src/sdk'

describe('ObservaSDK', () => {
    const originalFetch = global.fetch as any

    afterEach(() => {
        global.fetch = originalFetch
        jest.resetAllMocks()
    })

    test('ingest.event usa apiKey y retorna event_id', async () => {
        const fetchMock = (jest.fn() as any)
            .mockImplementationOnce(async () => ({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ ok: true }),
            }))
            .mockImplementationOnce(async () => ({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ event_id: 'evt_1' }),
            }))
        global.fetch = fetchMock as any
        const sdk = new ObservaSDK({ apiKey: 'dsnKey', dsnKey: 'dsn_123', baseUrl: 'http://localhost' })
        const result = await sdk.ingest.event({
            event: { level: 'error', message: 'boom' },
        })
        expect(result.event_id).toBe('evt_1')
        const [healthUrl, healthOptions] = (global.fetch as any).mock.calls[0]
        expect(healthUrl).toBe('http://localhost/v1/ingest/health')
        expect(healthOptions.method).toBe('POST')
        expect(healthOptions.headers['x-api-key']).toBe('dsnKey')
        expect(JSON.parse(healthOptions.body).dsnKey).toBe('dsn_123')
        const [eventUrl, eventOptions] = (global.fetch as any).mock.calls[1]
        expect(eventUrl).toBe('http://localhost/v1/ingest/events')
        expect(eventOptions.headers['x-api-key']).toBe('dsnKey')
    })

    test('ingest.event envía headers opcionales', async () => {
        const fetchMock = (jest.fn() as any)
            .mockImplementationOnce(async () => ({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ ok: true }),
            }))
            .mockImplementationOnce(async () => ({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ event_id: 'evt_2' }),
            }))
        global.fetch = fetchMock as any
        const sdk = new ObservaSDK({ apiKey: 'key_1', dsnKey: 'dsn_456', baseUrl: 'http://localhost' })
        await sdk.ingest.event({
            event: { level: 'error', message: 'boom' },
            idempotencyKey: 'req_1',
            sdkVersion: '2.0.0',
        })
        const [, eventOptions] = (global.fetch as any).mock.calls[1]
        expect(eventOptions.headers['x-idempotency-key']).toBe('req_1')
        expect(eventOptions.headers['x-sdk-version']).toBe('2.0.0')
    })

    test('getProcessContext expone datos del proceso', () => {
        const fetchMock = (jest.fn() as any).mockImplementation(async () => ({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ ok: true }),
        }))
        global.fetch = fetchMock as any
        const sdk = new ObservaSDK({ apiKey: 'key_1', dsnKey: 'dsn_456', baseUrl: 'http://localhost' })
        const context = sdk.getProcessContext()
        expect(context.pid).toBe(process.pid)
        expect(context.node).toBe(process.versions.node)
        expect(context.platform).toBe(process.platform)
        expect(context.arch).toBe(process.arch)
    })

    test('getProcessContext permite excluir data estática', () => {
        const fetchMock = (jest.fn() as any).mockImplementation(async () => ({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ ok: true }),
        }))
        global.fetch = fetchMock as any
        const sdk = new ObservaSDK({ apiKey: 'key_1', dsnKey: 'dsn_456', baseUrl: 'http://localhost' })
        const context = sdk.getProcessContext({ includeStatic: false })
        expect(context.versions).toBeUndefined()
        expect(context.node).toBeUndefined()
        expect(context.platform).toBeUndefined()
        expect(context.arch).toBeUndefined()
        expect(context.pid).toBe(process.pid)
    })

    test('getProcessContextStatic y getProcessContextDynamic separan contexto', () => {
        const fetchMock = (jest.fn() as any).mockImplementation(async () => ({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ ok: true }),
        }))
        global.fetch = fetchMock as any
        const sdk = new ObservaSDK({ apiKey: 'key_1', dsnKey: 'dsn_456', baseUrl: 'http://localhost' })
        const staticContext = sdk.getProcessContextStatic({ includeVersions: false })
        const dynamicContext = sdk.getProcessContextDynamic()
        expect(staticContext.versions).toBeUndefined()
        expect(staticContext.node).toBe(process.versions.node)
        expect(dynamicContext.pid).toBe(process.pid)
        expect(dynamicContext.uptimeSeconds).toBeDefined()
    })

    test('ingest.event usa publicKey cuando no hay apiKey', async () => {
        const fetchMock = (jest.fn() as any)
            .mockImplementationOnce(async () => ({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ ok: true }),
            }))
            .mockImplementationOnce(async () => ({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ event_id: 'evt_pk' }),
            }))
        global.fetch = fetchMock as any
        const sdk = new ObservaSDK({ publicKey: 'pk_test', dsnKey: 'dsn_test', baseUrl: 'http://localhost' })

        const result = await sdk.ingest.event({
            event: { level: 'error', message: 'browser error' },
        })

        expect(result.event_id).toBe('evt_pk')

        // Check health check call
        const [healthUrl, healthOptions] = (global.fetch as any).mock.calls[0]
        expect(healthUrl).toBe('http://localhost/v1/ingest/health')
        expect(healthOptions.headers['x-api-key']).toBeUndefined()
        const healthBody = JSON.parse(healthOptions.body)
        expect(healthBody.dsnKey).toBe('dsn_test')
        expect(healthBody.publicKey).toBe('pk_test')

        // Check event call
        const [eventUrl, eventOptions] = (global.fetch as any).mock.calls[1]
        expect(eventUrl).toBe('http://localhost/v1/ingest/events')
        expect(eventOptions.headers['x-api-key']).toBeUndefined()
        const eventBody = JSON.parse(eventOptions.body)
        expect(eventBody.dsnKey).toBe('dsn_test')
        expect(eventBody.publicKey).toBe('pk_test')
        expect(eventBody.event.message).toBe('browser error')
    })
})
