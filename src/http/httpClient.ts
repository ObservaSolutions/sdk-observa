import { AuthError, NetworkError, TimeoutError, mapHttpError } from './errors'

/**
 * Authentication mode per request.
 */
export type AuthMode = 'apiKey' | 'none'
/**
 * Supported HTTP methods.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
/**
 * Serializable query parameters.
 */
export type QueryParams = Record<string, string | number | boolean | undefined>

/**
 * Retry policy for transient errors.
 */
export type RetryPolicy = {
    /**
     * Number of additional retries.
     */
    retries: number
    /**
     * Computes the delay between retries.
     */
    retryDelayMs?: (attempt: number, response?: Response, error?: unknown) => number
    /**
     * Determines whether a response or error should be retried.
     */
    retryOn?: (response?: Response, error?: unknown) => boolean
}

/**
 * Base HTTP client configuration.
 */
export type HttpClientOptions = {
    /**
     * Backend base URL.
     */
    baseUrl: string
    /**
     * API key used for SDK authentication.
     */
    apiKey?: string
    /**
     * Request timeout in milliseconds.
     */
    timeoutMs?: number
    /**
     * Global headers.
     */
    headers?: Record<string, string>
    /**
     * Retry policy.
     */
    retry?: RetryPolicy
}

/**
 * Per-request options.
 */
export type RequestOptions = {
    method: HttpMethod
    path: string
    query?: QueryParams
    body?: unknown
    headers?: Record<string, string>
    /**
     * Defines whether the request requires an apiKey or is public.
     */
    auth?: AuthMode
}

/**
 * Base HTTP client for the SDK.
 */
export class HttpClient {
    private apiKey?: string
    private readonly baseUrl: string
    private readonly timeoutMs: number
    private readonly headers: Record<string, string>
    private readonly retry?: RetryPolicy
    private healthCheckPromise?: Promise<unknown>

    /**
     * Creates an HTTP client with baseUrl and optional apiKey.
     */
    constructor(options: HttpClientOptions) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, '')
        this.apiKey = options.apiKey
        this.timeoutMs = options.timeoutMs ?? 5000
        this.headers = options.headers ?? {}
        this.retry = options.retry
    }

    /**
     * Updates the API key at runtime.
     */
    setApiKey(apiKey?: string) {
        this.apiKey = apiKey
    }

    startHealthCheck(healthCheck: () => Promise<unknown>) {
        if (!this.healthCheckPromise) {
            const promise = healthCheck()
            this.healthCheckPromise = promise
            promise.catch(() => undefined)
        }
    }

    /**
     * GET request.
     */
    async get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'path'>): Promise<T> {
        return this.request<T>({ method: 'GET', path, ...options })
    }

    /**
     * POST request.
     */
    async post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'path' | 'body'>): Promise<T> {
        return this.request<T>({ method: 'POST', path, body, ...options })
    }

    /**
     * PUT request.
     */
    async put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'path' | 'body'>): Promise<T> {
        return this.request<T>({ method: 'PUT', path, body, ...options })
    }

    /**
     * PATCH request.
     */
    async patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'path' | 'body'>): Promise<T> {
        return this.request<T>({ method: 'PATCH', path, body, ...options })
    }

    /**
     * DELETE request.
     */
    async delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'path'>): Promise<T> {
        return this.request<T>({ method: 'DELETE', path, ...options })
    }

    /**
     * Executes a request with retry logic.
     */
    async request<T>(options: RequestOptions): Promise<T> {
        if (this.healthCheckPromise) {
            await this.healthCheckPromise
        }
        const retry = this.retry ?? { retries: 0 }
        const retryOn = retry.retryOn ?? ((response?: Response, error?: unknown) => {
            if (response) return response.status === 429 || response.status >= 500
            return error instanceof NetworkError || error instanceof TimeoutError || error instanceof TypeError
        })
        const retryDelayMs = retry.retryDelayMs ?? ((attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 8000))
        let lastError: unknown

        for (let attempt = 0; attempt <= retry.retries; attempt += 1) {
            try {
                const { response, data } = await this.execute(options)
                if (!response.ok) {
                    const retryAfter = this.parseRetryAfter(response.headers.get('retry-after'))
                    const error = mapHttpError(response.status, data, retryAfter)
                    if (retryOn(response, error) && attempt < retry.retries) {
                        await this.delay(retryDelayMs(attempt + 1, response, error))
                        continue
                    }
                    throw error
                }
                return data as T
            } catch (error) {
                lastError = error
                if (retryOn(undefined, error) && attempt < retry.retries) {
                    await this.delay(retryDelayMs(attempt + 1, undefined, error))
                    continue
                }
                throw error
            }
        }

        throw lastError
    }

    /**
     * Executes a request without retry and returns response + data.
     */
    private async execute(options: RequestOptions): Promise<{ response: Response; data: unknown }> {
        const url = this.buildUrl(options.path, options.query)
        const headers: Record<string, string> = { ...this.headers, ...options.headers }
        if (options.body !== undefined) headers['content-type'] = 'application/json'
        const authMode = options.auth ?? 'none'
        if (authMode === 'apiKey') {
            if (!this.apiKey) throw new AuthError('API key is required')
            headers['x-api-key'] = this.apiKey
        }

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), this.timeoutMs)

        try {
            const response = await fetch(url, {
                method: options.method,
                headers,
                body: options.body === undefined ? undefined : JSON.stringify(options.body),
                signal: controller.signal,
            })
            const data = await this.readBody(response)
            return { response, data }
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                throw new TimeoutError('Request timeout')
            }
            if (error instanceof NetworkError || error instanceof TimeoutError) throw error
            if (error instanceof Error) {
                if (error instanceof AuthError) throw error
            }
            if (error instanceof Error && 'status' in error) throw error
            throw new NetworkError('Network error', { details: error })
        } finally {
            clearTimeout(timer)
        }
    }

    /**
     * Builds the final URL with query params.
     */
    private buildUrl(path: string, query?: QueryParams): string {
        const base = this.baseUrl
        const fullPath = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
        if (!query) return fullPath
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(query)) {
            if (value === undefined) continue
            params.set(key, String(value))
        }
        const suffix = params.toString()
        return suffix ? `${fullPath}?${suffix}` : fullPath
    }

    /**
     * Parses the body as JSON when possible.
     */
    private async readBody(response: Response): Promise<unknown> {
        if (response.status === 204) return undefined
        const text = await response.text()
        if (!text) return undefined
        try {
            return JSON.parse(text)
        } catch {
            return text
        }
    }

    private parseRetryAfter(value: string | null): number | undefined {
        if (!value) return undefined
        const seconds = Number(value)
        if (!Number.isNaN(seconds) && Number.isFinite(seconds)) {
            return Math.max(0, seconds)
        }
        const parsedDate = Date.parse(value)
        if (Number.isNaN(parsedDate)) return undefined
        const diffMs = parsedDate - Date.now()
        if (diffMs <= 0) return 0
        return Math.ceil(diffMs / 1000)
    }

    /**
     * Simple delay for retries.
     */
    private async delay(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms))
    }
}
