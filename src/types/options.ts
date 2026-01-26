import type { ObservaEvent } from './event'

export type BeforeSend = (event: ObservaEvent) => ObservaEvent | null

export type Integration = {
    name: string
    setup: () => void
}

export type SDKOptions = {
    ingestUrl: string
    environment?: string
    release?: string
    enabled?: boolean
    sampleRate?: number
    tracesSampleRate?: number
    beforeSend?: BeforeSend
    integrations?: Integration[]
    apiKey?: string
}