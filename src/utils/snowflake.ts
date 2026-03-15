// Snowflake ID Generator
// 64-bit BigInt → string
// Layout: 41-bit timestamp | 10-bit machine ID | 12-bit sequence

const EPOCH = 1704067200000n // 2024-01-01T00:00:00Z
const MACHINE_ID = 0n
const MACHINE_BITS = 10n
const SEQUENCE_BITS = 12n
const MACHINE_SHIFT = SEQUENCE_BITS
const TIMESTAMP_SHIFT = MACHINE_BITS + SEQUENCE_BITS
const SEQUENCE_MASK = (1n << SEQUENCE_BITS) - 1n // 4095

let lastTimestamp = -1n
let sequence = 0n

export function generateId(): string {
  let now = BigInt(Date.now()) - EPOCH

  if (now === lastTimestamp) {
    sequence = (sequence + 1n) & SEQUENCE_MASK
    if (sequence === 0n) {
      // Sequence exhausted in this millisecond, wait for next
      while (now <= lastTimestamp) {
        now = BigInt(Date.now()) - EPOCH
      }
    }
  } else {
    sequence = 0n
  }

  lastTimestamp = now

  return (
    (now << TIMESTAMP_SHIFT) |
    (MACHINE_ID << MACHINE_SHIFT) |
    sequence
  ).toString()
}
