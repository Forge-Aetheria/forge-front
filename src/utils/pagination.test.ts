import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { fetchAllPages, MAX_PAGE_SIZE, type PageRequest } from './pagination'

const dataset = (size: number): number[] => Array.from({ length: size }, (_, index) => index)

describe('fetchAllPages', () => {
  it('fetches every item across pages when there are more than 100', async () => {
    const data = dataset(103)
    const calls: PageRequest[] = []

    const result = await fetchAllPages(async ({ take, skip }) => {
      calls.push({ take, skip })

      return data.slice(skip, skip + take)
    })

    assert.equal(result.length, 103)
    assert.deepEqual(calls, [
      { take: 100, skip: 0 },
      { take: 100, skip: 100 }
    ])
  })

  it('returns an empty list when there is no data', async () => {
    const calls: PageRequest[] = []

    const result = await fetchAllPages(async ({ take, skip }) => {
      calls.push({ take, skip })

      return []
    })

    assert.deepEqual(result, [])
    assert.deepEqual(calls, [{ take: 100, skip: 0 }])
  })

  it('clamps the page size to the backend cap', async () => {
    const data = dataset(150)
    const takes: number[] = []

    const result = await fetchAllPages(async ({ take, skip }) => {
      takes.push(take)

      return data.slice(skip, skip + take)
    }, 500)

    assert.equal(result.length, 150)
    assert.equal(takes[0], MAX_PAGE_SIZE)
  })

  it('stops after a partial page', async () => {
    const data = dataset(42)
    const calls: PageRequest[] = []

    const result = await fetchAllPages(async ({ take, skip }) => {
      calls.push({ take, skip })

      return data.slice(skip, skip + take)
    })

    assert.equal(result.length, 42)
    assert.equal(calls.length, 1)
  })
})
