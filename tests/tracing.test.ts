import { runWithNewScope, getScope } from '../src/core/scope'
import { continueTraceFromHeaders, getTraceHeaders } from '../src/tracing/propagation'

describe('Tracing propagation', () => {
    test('continúa trazas desde headers y construye headers de salida', () => {
        runWithNewScope({}, () => {
            continueTraceFromHeaders({ 'observa-trace': 'trace123-span456-1' })
            const scope = getScope()
            expect(scope.propagationContext.trace_id).toBe('trace123')
            expect(scope.propagationContext.span_id).toBe('span456')
            expect(scope.propagationContext.sampled).toBe(true)
            const headers = getTraceHeaders(scope.propagationContext)
            expect(headers['observa-trace']).toBe('trace123-span456-1')
        })
    })
})