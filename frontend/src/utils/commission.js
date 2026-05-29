export function calculateCommissionPreview(feeValue, percentageValue = 10) {
  const fee = Number(feeValue || 0);
  const percentage = Number(percentageValue ?? 10);
  const feeCents = Math.round(fee * 100);
  const commissionCents = Math.round(feeCents * (percentage / 100));
  const payoutCents = Math.max(0, feeCents - commissionCents);

  return {
    fee: feeCents / 100,
    commission: commissionCents / 100,
    payout: payoutCents / 100,
    percentage,
    earningPercentage: Math.max(0, 100 - percentage),
  };
}

export function normalizeCommissionPreview(preview, fallbackFee, fallbackPercentage = 10) {
  if (!preview) return calculateCommissionPreview(fallbackFee, fallbackPercentage);

  return {
    fee: Number(preview.consultation_fee ?? fallbackFee ?? 0),
    commission: Number(preview.commission_amount ?? 0),
    payout: Number(preview.psychologist_payout ?? 0),
    percentage: Number(preview.commission_percentage ?? fallbackPercentage ?? 10),
    earningPercentage: Math.max(0, 100 - Number(preview.commission_percentage ?? fallbackPercentage ?? 10)),
  };
}
