import { jest } from '@jest/globals'
import { IngestApi } from '../src/apis/ingestApi'
import { HttpClient } from '../src/http/httpClient'
import { ValidationError } from '../src/http/errors'

describe('IngestApi', () => {
    const originalFetch = global.fetch as any

    afterEach(() => {
        global.fetch = originalFetch
        jest.resetAllMocks()
    })

    test('envía headers opcionales y dsnKey por defecto', async () => {
        const fetchMock = (jest.fn() as any).mockImplementation(async () => ({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ event_id: 'evt_10' }),
        }))
        global.fetch = fetchMock as any
        const client = new HttpClient({ baseUrl: 'http://localhost', apiKey: 'key_1' })
        const api = new IngestApi(client, 'dsn_1')
        await api.event({
            event: {
                level: 'error',
                message: 'boom',
                schema_version: 1,
                context: {
                    system: { pid: 123, uptimeSeconds: 10 },
                    runtime: { node: '20.0.0', platform: 'linux', arch: 'x64' },
                    request: { requestId: 'req_1', userId: 'user_1' },
                },
            },
            idempotencyKey: 'req_10',
            sdkVersion: '2.0.0',
        })
        const [url, options] = (global.fetch as any).mock.calls[0]
        expect(url).toBe('http://localhost/ingest/events')
        expect(options.headers['x-idempotency-key']).toBe('req_10')
        expect(options.headers['x-sdk-version']).toBe('2.0.0')
        const body = JSON.parse(options.body)
        expect(body.dsnKey).toBe('dsn_1')
        expect(body.event.schema_version).toBe(1)
        expect(body.event.context.system.pid).toBe(123)
        expect(body.event.context.runtime.arch).toBe('x64')
        expect(body.event.context.request.requestId).toBe('req_1')
    })

    test('valida tamaño de idempotencyKey', async () => {
        const client = new HttpClient({ baseUrl: 'http://localhost', apiKey: 'key_1' })
        const api = new IngestApi(client, 'dsn_1')
        await expect(api.event({
            event: { level: 'error', message: 'boom' },
            idempotencyKey: 'a'.repeat(129),
        })).rejects.toBeInstanceOf(ValidationError)
    })

    test('health usa POST /ingest/health con dsnKey', async () => {
        const fetchMock = (jest.fn() as any).mockImplementation(async () => ({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ ok: true }),
        }))
        global.fetch = fetchMock as any
        const client = new HttpClient({ baseUrl: 'http://localhost', apiKey: 'key_1' })
        const api = new IngestApi(client, 'dsn_1')
        const result = await api.health()
        expect(result.ok).toBe(true)
        const [url, options] = (global.fetch as any).mock.calls[0]
        expect(url).toBe('http://localhost/ingest/health')
        expect(options.method).toBe('POST')
        expect(JSON.parse(options.body).dsnKey).toBe('dsn_1')
    })
})
