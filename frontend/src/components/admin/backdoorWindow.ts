/** A backdoor's schedule as the API takes it: ISO instants; `opens` omitted means now. */
export interface BackdoorWindow {
  opens?: string
  closes?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO instant to a `datetime-local` value, in the browser's zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** A `datetime-local` value to an ISO instant; blank stays undefined. */
export function fromLocalInput(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined
}
