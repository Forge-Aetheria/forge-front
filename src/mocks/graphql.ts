import { graphql as mswGraphql } from 'msw/graphql'

/**
 * GraphQL scoped client for MSW v2.
 * Captures all GraphQL queries and mutations directed to any host or local endpoint.
 */
export const gql = mswGraphql.link('*')
