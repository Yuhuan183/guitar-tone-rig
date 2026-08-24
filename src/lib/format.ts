/** Stage and slot numbers are displayed zero-padded; `0{n}` breaks past nine. */
export const pad2 = (value: number): string => String(value).padStart(2, '0')

export const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max - 1) + '…' : value
