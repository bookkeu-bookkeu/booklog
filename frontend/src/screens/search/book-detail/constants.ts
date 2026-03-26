export type RbtiTypeChip = {
  code: string;
  name: string;
};

export const RBTI_TYPE_CHIPS: RbtiTypeChip[] = [
  { code: 'RAN', name: '구조를 받아들이는 독해가' },
  { code: 'RAS', name: '핵심을 흡수하는 요약가' },
  { code: 'REN', name: '이야기에 스며드는 공감가' },
  { code: 'RES', name: '문장에 머무는 감성가' },
  { code: 'IAN', name: '구조를 해체하는 탐구가' },
  { code: 'IAS', name: '문장을 파고드는 해석가' },
  { code: 'IEN', name: '이야기를 확장하는 사유가' },
  { code: 'IES', name: '감정을 해석하는 철학가' },
];

export const OPPOSITE_RBTI_CODE: Record<string, string> = {
  RAN: 'IES',
  RAS: 'IEN',
  REN: 'IAS',
  RES: 'IAN',
  IAN: 'RES',
  IAS: 'REN',
  IEN: 'RAS',
  IES: 'RAN',
};
