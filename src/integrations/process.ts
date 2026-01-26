import type { Integration } from '../types/options'
import { captureException, flush } from '../core/hub'

export function ProcessIntegration(): Integration {
    return {
        name: 'process',
        setup() {
            process.on('unhandledRejection', async (reason: any) => { await captureException(reason) })
            process.on('uncaughtException', async (err: Error) => { await captureException(err); await flush() })
        }
    }
}