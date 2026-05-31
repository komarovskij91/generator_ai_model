export function PaidMediaControls({ flags = {}, disabled = false, onChange }) {
  const isPaid = Boolean(flags.is_paid)
  const unlockCost = flags.unlock_cost ?? null
  const previewStatus = flags.preview_status || ''

  return (
    <div className="paidMediaControls">
      <label className="flagToggle">
        <input
          type="checkbox"
          checked={isPaid}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.checked) {
              onChange({ ...flags, is_paid: true })
            } else {
              onChange({ is_adult: Boolean(flags.is_adult), is_paid: false })
            }
          }}
        />
        <span>Платный</span>
      </label>
      {isPaid ? (
        <>
          <div className="tokenCostRow">
            {[5, 10, 20].map((cost) => (
              <button
                key={cost}
                type="button"
                className={unlockCost === cost ? 'tokenCostBtn active' : 'tokenCostBtn'}
                disabled={disabled}
                onClick={() => onChange({ ...flags, is_paid: true, unlock_cost: cost })}
              >
                {cost} ♥
              </button>
            ))}
          </div>
          {previewStatus ? (
            <small className="fieldHint">
              preview: {previewStatus}
              {flags.preview_url ? ' ✓' : ''}
            </small>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
