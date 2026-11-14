/**
 * Legacy business keys written by the pre-TICK-041 mock/localStorage layer.
 * They must never be used as a data source. Cosmetic/UI preferences and the
 * auth session are intentionally excluded.
 */
export const LEGACY_BUSINESS_STORAGE_KEYS = [
  'forge_inventory_templates_v2',
  'forge_inventory_movements_v2',
  'forge_inventory_adjustments_v2',
  'forge_inventory_categories_v1',
  'forge_inventory_warehouses_v1',
  'forge_inventory_operation_orders_v1',
  'forge_inventory_landed_costs_v1',
  'forge_purchases_quotes_v1',
  'forge_purchases_feature_flags_v1',
  'forge_purchases_transit_notifications_v1',
  'forge_sales_quotes',
  'forge_sales_feature_flags',
  'forge_pos_bcv_rate',
  'forge_pos_fiscal_mode',
  'forge_pos_parked_orders',
  'forge_pos_active_shift',
  'foundly_company_settings',
  'foundly_bcv_settings',
  'foundly_erp_users',
  'foundly_fiscal_rules',
  'foundly_commercial_policies',
  'foundly_bank_accounts'
] as const

export const isLegacyBusinessStorageKey = (key: string): boolean =>
  LEGACY_BUSINESS_STORAGE_KEYS.includes(key as (typeof LEGACY_BUSINESS_STORAGE_KEYS)[number])

/** Removes legacy business keys. Returns the keys actually removed. */
export const purgeLegacyBusinessStorage = (): string[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const removed: string[] = []

  for (const key of LEGACY_BUSINESS_STORAGE_KEYS) {
    if (window.localStorage.getItem(key) !== null) {
      window.localStorage.removeItem(key)
      removed.push(key)
    }
  }

  return removed
}

/** True when any legacy business key is still present. */
export const hasLegacyBusinessStorage = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  return LEGACY_BUSINESS_STORAGE_KEYS.some(key => window.localStorage.getItem(key) !== null)
}
