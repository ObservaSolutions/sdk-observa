import { init, captureMessage, captureException, flush } from '../src/core/hub'

describe('Hub + Transport (HTTP)', () => {
  const originalFetch = global.fetch as any

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as any
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetAllMocks()
  })

  test('captureMessage envía evento y flush llama fetch', async () => {
    init({ ingestUrl: 'http://localhost/api/store', sampleRate: 1 })
    await captureMessage('hello', 'info')
    await flush()
    expect(global.fetch).toHaveBeenCalled()
    const [, options] = (global.fetch as any).mock.calls[0]
    const event = JSON.parse(options.body)
    expect(event.level).toBe('info')
    expect(event.message).toBe('hello')
  })

  test('captureException envía evento con exception', async () => {
    init({ ingestUrl: 'http://localhost/api/store', sampleRate: 1 })
    const id = await captureException(new Error('Boom'))
    expect(typeof id).toBe('string')
    await flush()
    const [, options] = (global.fetch as any).mock.calls[0]
    const event = JSON.parse(options.body)
    expect(event.level).toBe('error')
    expect(event.exception.value).toContain('Boom')
  })
})