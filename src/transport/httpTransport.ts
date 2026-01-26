import type { ObservaEvent } from '../types/event'
import type { SDKOptions } from '../types/options'

export class HttpTransport {

    constructor(private readonly options: SDKOptions) {

    }


    async send(event: ObservaEvent): Promise<void> {
        const url = this.options.ingestUrl;
        if (!url) return;

        const headers: Record<string, string> = { 'content-type': 'application/json' }
        if (this.options.apiKey) headers['authorization'] = `Bearer ${this.options.apiKey}`;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);

        try {
            await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(event),
                signal: controller.signal
            })
        } finally {
            clearTimeout(id)
        }
    }
}