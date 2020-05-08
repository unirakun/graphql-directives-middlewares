/* eslint-env jest */
import gql from 'graphql-tag'
import { makeExecutableSchema } from 'graphql-tools'
import { graphql, GraphQLError } from 'graphql'
import { createVisitObject, createVisitFieldDefinition } from './dist/index'

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

  it('should create a visit object directive', async () => {
    const impl = jest.fn()
    const middleware = jest.fn((params, next) => (...args) => {
      impl(...args)
      return next()
    })

    // directive definition & implementation
    const firstImpl = createVisitObject('first', middleware)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first on OBJECT

        type Query @first {
          list: [String]
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
      {},
      { context: true },
    )

    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(res.data).toEqual({ list: ['john', 'smith'] })
  })

  it('should calls visit object directive in order (first -> second)', async () => {
    // directive definition & implementation
    const called = []
    // - first
    const impl = jest.fn()
    const middleware = jest.fn((params, next) => (...args) => {
      called.push('first')
      impl(...args)
      return next()
    })
    const firstImpl = createVisitObject('first', middleware)
    // -- second
    const impl2 = jest.fn()
    const middleware2 = jest.fn((params, next) => (...args) => {
      called.push('second')
      impl2(...args)
      return next()
    })
    const secondImpl = createVisitObject('second', middleware2)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first on OBJECT
        directive @second on OBJECT

        type Query @first @second {
          list: [String]
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
      {},
      { context: true },
    )

    expect(called).toEqual(['first', 'second'])
    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(impl2).toHaveBeenCalledTimes(1)
    expect(impl2.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(res.data).toEqual({ list: ['john', 'smith'] })
  })

  it('should calls visit object directive in order (second -> first)', async () => {
    // directive definition & implementation
    const called = []
    // - first
    const impl = jest.fn()
    const middleware = jest.fn((params, next) => (...args) => {
      called.push('first')
      impl(...args)
      return next()
    })
    const firstImpl = createVisitObject('first', middleware)
    // -- second
    const impl2 = jest.fn()
    const middleware2 = jest.fn((params, next) => (...args) => {
      called.push('second')
      impl2(...args)
      return next()
    })
    const secondImpl = createVisitObject('second', middleware2)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first on OBJECT
        directive @second on OBJECT

        type Query @second @first {
          list: [String]
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
      {},
      { context: true },
    )

    expect(called).toEqual(['second', 'first'])
    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(impl2).toHaveBeenCalledTimes(1)
    expect(impl2.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(res.data).toEqual({ list: ['john', 'smith'] })
  })

  it('should call visit object before visit field', async () => {
    // directive definition & implementation
    const called = []
    // - first
    const impl = jest.fn()
    const middleware = jest.fn((params, next) => (...args) => {
      called.push('first')
      impl(...args)
      return next()
    })
    const firstImpl = createVisitObject('first', middleware)
    // -- second
    const impl2 = jest.fn()
    const middleware2 = jest.fn((params, next) => (...args) => {
      called.push('second')
      impl2(...args)
      return next()
    })
    const secondImpl = createVisitFieldDefinition('second', middleware2)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first on OBJECT
        directive @second on FIELD_DEFINITION

        type Query @first {
          list: [String] @second
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
      {},
      { context: true },
    )

    expect(called).toEqual(['first', 'second'])
    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(impl2).toHaveBeenCalledTimes(1)
    expect(impl2.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(res.data).toEqual({ list: ['john', 'smith'] })
  })

  it('should not visit field if object does not call next', async () => {
    // directive definition & implementation
    const called = []
    // - first
    const impl = jest.fn(() => ['fake'])
    const middleware = jest.fn(() => (...args) => {
      called.push('first')
      return impl(...args)
    })
    const firstImpl = createVisitObject('first', middleware)
    // -- second
    const impl2 = jest.fn()
    const middleware2 = jest.fn((params, next) => (...args) => {
      called.push('second')
      impl2(...args)
      return next()
    })
    const secondImpl = createVisitFieldDefinition('second', middleware2)

    // create gql schema
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first on OBJECT
        directive @second on FIELD_DEFINITION

        type Query @first {
          list: [String] @second
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
      {},
      { context: true },
    )

    expect(called).toEqual(['first'])
    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        fieldName: 'list',
      }),
    )
    expect(impl2).toHaveBeenCalledTimes(0)
    expect(res.data).toEqual({ list: ['fake'] })
  })

  it('should process the whole middlewares chain after a previous request is in error caused by a middleware', async () => {
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
    // - first run on error (from middleware)
    impl.mockImplementationOnce(() => {
      throw new Error('an error')
    })
    const res1 = await graphql(
      schema,
      `
        {
          list
        }
      `,
    )
    expect(impl).toHaveBeenCalledTimes(1)
    expect(res1).toEqual({
      errors: [new GraphQLError('an error')],
      data: {
        list: null,
      },
    })

    // - second run ok (no error)
    const res2 = await graphql(
      schema,
      `
        {
          list
        }
      `,
    )
    expect(impl).toHaveBeenCalledTimes(2)
    expect(res2).toEqual({
      data: {
        list: ['john', 'smith'],
      },
    })
  })

  it('should process the whole middlewares chain after a previous request is in error caused by the resolver', async () => {
    const impl = jest.fn()
    const middleware = jest.fn((params, next) => (...args) => {
      impl(...args)
      next()
    })

    // directive definition & implementation
    const firstImpl = createVisitFieldDefinition('first', middleware)

    // create gql schema
    const resolver = jest.fn(() => ['john', 'smith'])
    const schema = makeExecutableSchema({
      typeDefs: gql`
        directive @first on FIELD_DEFINITION

        type Query {
          list: [String] @first
        }
      `,
      resolvers: {
        Query: {
          list: resolver,
        },
      },
      schemaDirectives: {
        first: firstImpl,
      },
    })

    // run & asserts
    // - first run with leaf resolver error
    resolver.mockImplementationOnce(() => {
      throw new GraphQLError('resolver error')
    })
    const res1 = await graphql(
      schema,
      `
        {
          list
        }
      `,
    )
    expect(impl).toHaveBeenCalledTimes(1)
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(res1).toEqual({
      errors: [new GraphQLError('resolver error')],
      data: {
        list: null,
      },
    })

    // - second run ok (no error)
    const res2 = await graphql(
      schema,
      `
        {
          list
        }
      `,
    )
    expect(impl).toHaveBeenCalledTimes(2)
    expect(resolver).toHaveBeenCalledTimes(2)
    expect(res2).toEqual({
      data: {
        list: ['john', 'smith'],
      },
    })
  })
})
