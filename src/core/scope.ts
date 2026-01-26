import { AsyncLocalStorage } from 'node:async_hooks'
import type { Breadcrumb } from '../types/breadcrumb'

export type Scope = {
    user?: { id?: string; email?: string; username?: string }
    tags: Record<string, string>
    extra: Record<string, unknown>
    breadcrumbs: Breadcrumb[]
    context?: { environment?: string; release?: string; service?: string }
    propagationContext: { trace_id?: string; span_id?: string; sampled?: boolean }
}

type Stack = { stack: Scope[] }

const als = new AsyncLocalStorage<Stack>()

const baseScope: Scope = { tags: {}, extra: {}, breadcrumbs: [], context: {}, propagationContext: {} }

function cloneScope(s: Scope): Scope {
    return {
        user: s.user ? { ...s.user } : undefined,
        tags: { ...s.tags },
        extra: { ...s.extra },
        breadcrumbs: [...s.breadcrumbs],
        context: s.context ? { ...s.context } : undefined,
        propagationContext: { ...s.propagationContext },
    }
}

export function runWithNewScope(initial: Partial<Scope>, fn: () => any) {
    const s = cloneScope(baseScope)
    if (initial.user) s.user = { ...initial.user }
    if (initial.tags) s.tags = { ...s.tags, ...initial.tags }
    if (initial.extra) s.extra = { ...s.extra, ...initial.extra }
    if (initial.context) s.context = { ...s.context, ...initial.context }
    if (initial.propagationContext) s.propagationContext = { ...s.propagationContext, ...initial.propagationContext }
    als.run({ stack: [s] }, fn)
}

function getStack(): Scope[] {
    const store = als.getStore()
    if (store && store.stack.length) return store.stack
    return [baseScope]
}

export function getScope(): Scope {
    const stack = getStack()
    const latestStack = stack[stack.length - 1]
    return latestStack ?? baseScope
}

export function configureScope(fn: (scope: Scope) => void) {
    fn(getScope())
}

export function setUser(user: Scope['user'] | null) {
    const s = getScope()
    s.user = user ?? undefined
}

export function setTag(key: string, value: string) {
    const s = getScope()
    s.tags[key] = value
}

export function setExtra(key: string, value: unknown) {
    const s = getScope()
    s.extra[key] = value
}

export function addBreadcrumb(b: Breadcrumb) {
    const s = getScope()
    s.breadcrumbs.push(b)
}

export function setBaseContext(context: NonNullable<Scope['context']>) {
    baseScope.context = { ...(baseScope.context ?? {}), ...context }
}

export function setPropagationContext(ctx: Scope['propagationContext']) {
    const s = getScope()
    s.propagationContext = { ...s.propagationContext, ...ctx }
}

export function pushScope() {
    const store = als.getStore()
    const s = cloneScope(getScope())
    if (store) store.stack.push(s)
    else als.enterWith({ stack: [baseScope, s] })
}

export function popScope() {
    const store = als.getStore()
    if (store && store.stack.length > 1) store.stack.pop()
}

export async function withScope<T>(cb: () => Promise<T> | T): Promise<T> {
    pushScope()
    try {
        return await cb()
    } finally {
        popScope()
    }
}

export function getBaseScope(): Scope {
    return baseScope
}