// Craftcloud material configuration IDs, keyed by print type.
// Keep in sync with server-side uses.
export const CRAFTCLOUD_CONFIG_IDS = {
  color: 'a69b05d8-39b9-5f3e-bd47-9df42b4b84c3',
  mono:  '6250ed03-5e96-5de8-bf06-44a13b952058',  // SLA Resin
  sls:   '6c633df0-aca1-5b95-aaab-5c19b4e0d24f',  // SLS Nylon PA12
} as const;

export type PrintType = keyof typeof CRAFTCLOUD_CONFIG_IDS;
