export function basePort(seed: string, offset?: number): number
export function isPortFree(port: number): Promise<boolean>
export function pickPort(options: { seed: string; offset?: number; envVar?: string }): Promise<number>
