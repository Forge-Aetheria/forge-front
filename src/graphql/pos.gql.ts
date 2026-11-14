export const GET_POS_TERMINALS_QUERY = `
  query GetPosTerminals {
    posTerminals(take: 20) {
      id
      name
      code
      status
    }
  }
`

export const GET_ACTIVE_POS_SHIFT_QUERY = `
  query GetActivePosShift($terminalId: ID!) {
    activePosShift(terminalId: $terminalId) {
      id
      terminalId
      terminal { id name code }
      openedBy
      openedAt
      closedBy
      closedAt
      exchangeRate
      initialBalanceUsd
      initialBalanceVes
      cashSalesUsd
      cashSalesVes
      electronicSalesUsd
      electronicSalesVes
      countedCashUsd
      countedCashVes
      differenceUsd
      differenceVes
      status
    }
  }
`

export const OPEN_POS_SHIFT_MUTATION = `
  mutation OpenPosShift($input: OpenPosShiftInput!) {
    openPosShift(input: $input) {
      id
      terminalId
      terminal { id name code }
      openedBy
      openedAt
      exchangeRate
      initialBalanceUsd
      initialBalanceVes
      status
    }
  }
`

export const CLOSE_POS_SHIFT_MUTATION = `
  mutation ClosePosShift($input: ClosePosShiftInput!) {
    closePosShift(input: $input) {
      id
      terminalId
      terminal { id name code }
      openedBy
      openedAt
      closedAt
      exchangeRate
      initialBalanceUsd
      initialBalanceVes
      cashSalesUsd
      cashSalesVes
      electronicSalesUsd
      electronicSalesVes
      countedCashUsd
      countedCashVes
      differenceUsd
      differenceVes
      status
    }
  }
`

export const GET_TENANT_SETTING_QUERY = `
  query GetTenantSetting($key: String!) {
    tenantSetting(key: $key)
  }
`

export const SET_TENANT_SETTING_MUTATION = `
  mutation SetTenantSetting($input: SetTenantSettingInput!) {
    setTenantSetting(input: $input) {
      key
      value
    }
  }
`
