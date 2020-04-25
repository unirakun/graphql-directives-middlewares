import gql from 'graphql-tag'
import { makeExecutableSchema } from 'graphql-tools'
import { graphql } from 'graphql'
import { createVisitFieldDefinition } from './dist/index'

describe('graphql-directives-middlewares', () => {
  it('should add a "visite field" directive', async () => {
    const impl = jest.fn()
    const middleware = jest.fn((params, next) => (...args) => {
      impl(...args)
      return next()
    })

    // directive definition & implementation
    const firstImpl = createVisitFieldDefinition('first', middleware)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first on FIELD_DEFINITION

        type Query {
          list: [String] @first
        }
      `,
      resolvers: {
        Query: {
          list: () => ['john', 'smith'],
        },
      },
      schemaDirectives: {
        first: firstImpl,
      },
    })

    // run & asserts
    const res = await graphql(
      schema,
      `
        {
          list
        }
      `,
    )

    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(res.data).toEqual({ list: ['john', 'smith'] })
  })

  it('should pass variables', async () => {
    const impl = jest.fn()
    const middleware = jest.fn((params, next) => (...args) => {
      impl(...args)
      return next()
    })

    // directive definition & implementation
    const firstImpl = createVisitFieldDefinition('first', middleware)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first(name: String) on FIELD_DEFINITION

        type Query {
          list: [String] @first(name: "a param")
        }
      `,
      resolvers: {
        Query: {
          list: () => ['john', 'smith'],
        },
      },
      schemaDirectives: {
        first: firstImpl,
      },
    })

    // run & asserts
    const res = await graphql(
      schema,
      `
        {
          list
        }
      `,
    )

    expect(middleware).toHaveBeenCalledTimes(1)
    expect(middleware.mock.calls[0][0]).toEqual({ name: 'a param' })
    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(res.data).toEqual({ list: ['john', 'smith'] })
  })

  it('should call middleware in definition order (first -> second)', async () => {
    // directive definition & implementation
    const called = []
    // - first
    const impl = jest.fn(() => {
      called.push('first')
    })
    const middleware = jest.fn((params, next) => (...args) => {
      impl(...args)
      return next()
    })
    const firstImpl = createVisitFieldDefinition('first', middleware)
    // - second
    const impl2 = jest.fn(() => {
      called.push('second')
    })
    const middleware2 = jest.fn((params, next) => (...args) => {
      impl2(...args)
      return next()
    })
    const secondImpl = createVisitFieldDefinition('second', middleware2)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first(name: String) on FIELD_DEFINITION
        directive @second(name: String) on FIELD_DEFINITION

        type Query {
          list: [String] @first(name: "a param") @second(name: "an other param")
        }
      `,
      resolvers: {
        Query: {
          list: () => ['john', 'smith'],
        },
      },
      schemaDirectives: {
        first: firstImpl,
        second: secondImpl,
      },
    })

    // run & asserts
    const res = await graphql(
      schema,
      `
        {
          list
        }
      `,
    )

    expect(middleware).toHaveBeenCalledTimes(1)
    expect(middleware2).toHaveBeenCalledTimes(1)
    expect(middleware.mock.calls[0][0]).toEqual({ name: 'a param' })
    expect(middleware2.mock.calls[0][0]).toEqual({ name: 'an other param' })
    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl2).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(impl2.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(res.data).toEqual({ list: ['john', 'smith'] })
    expect(called).toEqual(['first', 'second'])
  })

  it('should call middleware in definition order (second -> first)', async () => {
    // directive definition & implementation
    const called = []
    // - first
    const impl = jest.fn(() => {
      called.push('first')
    })
    const middleware = jest.fn((params, next) => (...args) => {
      impl(...args)
      return next()
    })
    const firstImpl = createVisitFieldDefinition('first', middleware)
    // - second
    const impl2 = jest.fn(() => {
      called.push('second')
    })
    const middleware2 = jest.fn((params, next) => (...args) => {
      impl2(...args)
      return next()
    })
    const secondImpl = createVisitFieldDefinition('second', middleware2)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first(name: String) on FIELD_DEFINITION
        directive @second(name: String) on FIELD_DEFINITION

        type Query {
          list: [String] @second(name: "an other param") @first(name: "a param")
        }
      `,
      resolvers: {
        Query: {
          list: () => ['john', 'smith'],
        },
      },
      schemaDirectives: {
        first: firstImpl,
        second: secondImpl,
      },
    })

    // run & asserts
    const res = await graphql(
      schema,
      `
        {
          list
        }
      `,
    )

    expect(middleware).toHaveBeenCalledTimes(1)
    expect(middleware2).toHaveBeenCalledTimes(1)
    expect(middleware.mock.calls[0][0]).toEqual({ name: 'a param' })
    expect(middleware2.mock.calls[0][0]).toEqual({ name: 'an other param' })
    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl2).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(impl2.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(res.data).toEqual({ list: ['john', 'smith'] })
    expect(called).toEqual(['second', 'first'])
  })
})
