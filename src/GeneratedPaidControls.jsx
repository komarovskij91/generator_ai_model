import { PaidMediaControls } from './PaidMediaControls'

export function GeneratedPaidControls({ checked, disabled, onChange }) {
  return (
    <PaidMediaControls
      disabled={disabled}
      flags={{
        is_paid: Boolean(checked.is_paid),
        unlock_cost: checked.unlock_cost ?? null,
      }}
      onChange={(nextFlags) =>
        onChange({
          ...checked,
          is_paid: Boolean(nextFlags.is_paid),
          unlock_cost: nextFlags.unlock_cost ?? null,
        })
      }
    />
  )
}

export function setGeneratedPaidFlags(prev, key, nextFlags, defaults = {}) {
  const current = prev[key] || defaults
  return {
    ...prev,
    [key]: {
      ...current,
      is_paid: Boolean(nextFlags.is_paid),
      unlock_cost: nextFlags.unlock_cost ?? null,
    },
  }
}
