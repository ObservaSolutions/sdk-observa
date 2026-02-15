export type ProcessContextStatic = {
    versions?: NodeJS.ProcessVersions
    node?: string
    platform?: NodeJS.Platform
    arch?: string
    releaseName?: string
}

export type ProcessContextDynamic = {
    pid?: number
    uptimeSeconds?: number
    memory?: NodeJS.MemoryUsage
}

export type ProcessContext = ProcessContextStatic & ProcessContextDynamic

export type ProcessContextOptions = {
    includeStatic?: boolean
    includeDynamic?: boolean
    includeVersions?: boolean
    includeRuntime?: boolean
    includePid?: boolean
    includeUptime?: boolean
    includeMemory?: boolean
}

export type ProcessContextStaticOptions = {
    includeVersions?: boolean
    includeRuntime?: boolean
}

export type ProcessContextDynamicOptions = {
    includePid?: boolean
    includeUptime?: boolean
    includeMemory?: boolean
}

export function getProcessContext(options?: ProcessContextOptions): ProcessContext {
    const includeStatic = options?.includeStatic ?? true
    const includeDynamic = options?.includeDynamic ?? true
    const includeVersions = options?.includeVersions ?? true
    const includeRuntime = options?.includeRuntime ?? true
    const includePid = options?.includePid ?? true
    const includeUptime = options?.includeUptime ?? true
    const includeMemory = options?.includeMemory ?? true
    const context: ProcessContext = {}

    if (includeDynamic) {
        if (includePid) context.pid = process.pid
        if (includeUptime) context.uptimeSeconds = Math.round(process.uptime())
        if (includeMemory) context.memory = process.memoryUsage()
    }

    if (includeStatic) {
        if (includeVersions) context.versions = process.versions
        if (includeRuntime) {
            context.node = process.versions.node
            context.platform = process.platform
            context.arch = process.arch
            context.releaseName = process.release?.name
        }
    }

    return context
}

export function getProcessContextStatic(options?: ProcessContextStaticOptions): ProcessContextStatic {
    return getProcessContext({
        includeDynamic: false,
        includeStatic: true,
        includeVersions: options?.includeVersions,
        includeRuntime: options?.includeRuntime,
    })
}

export function getProcessContextDynamic(options?: ProcessContextDynamicOptions): ProcessContextDynamic {
    return getProcessContext({
        includeStatic: false,
        includeDynamic: true,
        includePid: options?.includePid,
        includeUptime: options?.includeUptime,
        includeMemory: options?.includeMemory,
    })
}
