export type Breadcrumb = {
    timestamp: string
    message?: string
    category?: string
    level?: 'error' | 'warning' | 'info' | 'debug'
    data?: Record<string, unknown>
}