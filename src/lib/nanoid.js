const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function nanoid(length = 21) {
  let result = ''
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  for (const b of bytes) result += chars[b % chars.length]
  return result
}
