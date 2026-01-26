import { runWithNewScope, setTag, setUser } from '../core/scope'
import { captureException } from '../core/hub'

export function requestHandler() {
    return function (req: any, res: any, next: any) {
        runWithNewScope({}, () => {
            setTag('http.method', String(req.method))
            if (req.route && req.route.path) setTag('http.route', String(req.route.path))
            setTag('http.url', String(req.originalUrl ?? req.url))
            if (req.user) setUser({ id: req.user.id, email: req.user.email, username: req.user.username })
            next()
        })
    }
}

export function errorHandler() {
    return async function (err: any, req: any, res: any, next: any) {
        await captureException(err, { request: { method: req.method, url: req.originalUrl ?? req.url } })
        next(err)
    }
}