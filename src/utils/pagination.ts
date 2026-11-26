/** Maximum page size accepted by the backend (`RolesService.clampTake`). */
export const MAX_PAGE_SIZE = 100

export interface PageRequest {
  take: number
  skip: number
}

export type PageFetcher<T> = (request: PageRequest) => Promise<T[]>

/**
 * Fetches every page of a paginated GraphQL connection-like query using
 * `take`/`skip`, stopping at the first partial page. Page size is clamped to
 * the backend cap (100) to avoid truncated results (the permission catalog
 * currently has 103 actions).
 */
export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  pageSize: number = MAX_PAGE_SIZE
): Promise<T[]> {
  const size = Math.min(Math.max(Math.trunc(pageSize) || MAX_PAGE_SIZE, 1), MAX_PAGE_SIZE)
  const results: T[] = []
  let skip = 0

  // Hard cap to avoid an infinite loop if a server ignores `skip`.
  for (let page = 0; page < 10_000; page += 1) {
    const items = await fetchPage({ take: size, skip })

    results.push(...items)

    if (items.length < size) {
      break
    }

    skip += size
  }

  return results
}
