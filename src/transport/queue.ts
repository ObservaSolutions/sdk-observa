import type { ObservaEvent } from '../types/event'

type Transport = { send: (e: ObservaEvent) => Promise<void> }

export class EventQueue {
    private items: ObservaEvent[] = [];
    private flushing = false;

    constructor(private readonly transport: Transport) {

    }

    push(e: ObservaEvent) {
        this.items.push(e);
        if (!this.flushing) this.flushSoon();
    }

    async flush() {
        if (this.flushing) return;
        this.flushing = true

        try {
            while (this.items.length) {
                const e = this.items.shift()!;
                try {
                    await this.transport.send(e)
                } catch { }
            }
        } finally {
            this.flushing = false
        }
    }

    private flushSoon() {
        setTimeout(() => this.flush(), 0)
    }
}