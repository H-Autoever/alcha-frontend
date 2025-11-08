export const ALERT_TYPE_LABELS = {
  COLLISION: '충돌 발생',
  SUDDEN_UNINTENDED_ACCELERATION: '급발진 의심',
  RAMP_PARKING: '경사로 주차',
  HIGH_TEMPERATURE: '고온 주행',
  ENGINE_OIL_CHECK: '엔진 오일 점검',
  ENGINE_CHECK: '엔진 점검',
  COOLANT_CHECK: '냉각수 점검',
  AIRBAG_CHECK: '에어백 점검',
} as const;

type AlertTypeKey = keyof typeof ALERT_TYPE_LABELS;

export const getAlertLabel = (alertType: string) => {
  const normalizedType = alertType.trim() as AlertTypeKey;
  return ALERT_TYPE_LABELS[normalizedType] ?? alertType;
};

export const ALERT_SEVERITY_LABELS = {
  CAUTION: '정보',
  WARNING: '경고',
  DANGER: '심각',
} as const;

type AlertSeverityKey = keyof typeof ALERT_SEVERITY_LABELS;

export const getAlertSeverityLabel = (severity: string) => {
  const normalizedSeverity = severity.trim() as AlertSeverityKey;
  return ALERT_SEVERITY_LABELS[normalizedSeverity] ?? severity;
};
