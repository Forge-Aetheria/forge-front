export const TENANT_AVATAR_UPDATED_EVENT = 'foundly:tenant-avatar-updated'

export const getTenantInitials = (name?: string | null): string => {
  if (!name) return 'FE'

  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'FE'

  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}
