import { authHandlers } from './authHandlers'
import { inventoryHandlers } from './inventoryHandlers'
import { contactsHandlers } from './contactsHandlers'
import { commerceHandlers } from './commerceHandlers'
import { accountingHandlers } from './accountingHandlers'

export const handlers = [
  ...authHandlers,
  ...inventoryHandlers,
  ...contactsHandlers,
  ...commerceHandlers,
  ...accountingHandlers
]
