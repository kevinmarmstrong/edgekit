import { stepCountIs, tool } from 'ai'
import { z } from 'zod'

export { stepCountIs, tool }

export function modelOptional<T extends z.ZodType>(schema: T) {
  return z.preprocess(value => (value === null ? undefined : value), schema.optional())
}
