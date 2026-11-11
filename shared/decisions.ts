export const menuPreparations: Record<string, readonly [string, string, string]> = {
  STEAK: ['Burger', 'Sirloin', 'Filet'],
  'ROAST BEEF': ['Sandwich', 'Sirloin', 'Rib Eye'],
  CHICKEN: ['Fingers', 'Breast', 'Game Hen'],
  VEAL: ['Pattie', 'Cutlet', 'Chop'],
  PASTA: ['Domestic', 'Imported', 'Fresh'],
  'FIN FISH': ['Portion', 'Fresh', 'Imported'],
  SHRIMP: ['Breaded', 'Fresh', 'Jumbo'],
  'SALAD BOWL': ['Prepack', 'Self Sv', 'Gourmet'],
  PORK: ['BBQ', 'Ribs', 'Loin'],
  PIZZA: ['Frozen', 'Fresh', 'Gourmet'],
  BEER: ['Popular', 'Premium', 'Imported'],
  WINE: ['House', 'Domestic', 'Imported'],
  SPIRITS: ['Well', 'Top Shf', 'Premium'],
}

export const financeFields = ['TimeDepositChange', 'CertificateOfDepositChange', 'NotePayableChange'] as const
export const decisionFields = [
  { key: 'StaffPerDay', label: 'Staff FTEs per day', decimals: 1 },
  { key: 'HourlyCompensation', label: 'Hourly compensation and training ($)', decimals: 2 },
  { key: 'AmenitiesPerOrder', label: 'Amenities per order ($)', decimals: 2 },
  { key: 'EntertainmentBudget', label: 'Entertainment budget ($)', decimals: 0 },
  { key: 'MaintenanceBudget', label: 'Maintenance budget ($)', decimals: 0 },
  { key: financeFields[0], label: 'Time deposit change ($)', decimals: 0 },
  { key: financeFields[1], label: 'Certificate of deposit change ($)', decimals: 0 },
  { key: financeFields[2], label: 'Note payable change ($)', decimals: 0 },
] as const
export const reportFields = [
  { key: 'ReportGuestSatisfaction', label: 'Guest satisfaction report' },
  { key: 'ReportFinancial', label: 'Financial report' },
  { key: 'ReportProduct', label: 'Product report' },
] as const

export type DecisionValues = Record<
  typeof decisionFields[number]['key'] | typeof reportFields[number]['key'], number | null
>
export type MenuSelection = {
  MenuItemID: number
  PrepLevel: number
  OrderSize: number
  InternalPromotion: number
  SalesPrice: number
}
export type CatalogItem = { MenuItemID: number; ItemName: string; OrderSizeUnit: string }
export type DecisionResponse = {
  catalog: CatalogItem[]
  values: DecisionValues
  menu: MenuSelection[]
  revision: string | null
  submittedAt: string | null
}

export const decisionRounds = [2, 3, 4, 5, 6, 7]
export const menuSlots = 10
