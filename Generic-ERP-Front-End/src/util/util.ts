import type { ISODateString } from '@/api/interface'

function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString
}

export { toISODateString }
