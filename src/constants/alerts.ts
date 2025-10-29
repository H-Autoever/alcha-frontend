export const ALERT_TYPE_LABELS = {
  COLLISION: '충돌 발생',
  SUDDEN_UNINTENDED_ACCELERATION: '급발진 의심',
  RAMP_PARKING: '경사로 주차',
} as const;

type AlertTypeKey = keyof typeof ALERT_TYPE_LABELS;

export const getAlertLabel = (alertType: string) => {
  const normalizedType = alertType.trim() as AlertTypeKey;
  return ALERT_TYPE_LABELS[normalizedType] ?? alertType;
};
