# graphql-directives-middlewares

GraphQL directives as middlewares

[![CircleCI](https://circleci.com/gh/unirakun/graphql-directives-middlewares.svg?style=shield)](https://circleci.com/gh/unirakun/graphql-directives-middlewares) [![NPM Version](https://badge.fury.io/js/graphql-directives-middlewares.svg)](https://www.npmjs.com/package/graphql-directives-middlewares)

## install

`yarn add graphql-directives-middlewares`

> You need to have `graphql` and `graphql-tools` installed on your project.

## why

We create this library because we needed our directives to be sorted at runtime.
We were on the case we needed to execute our `@auth` directive BEFORE our `@api` directive take place.

With `graphql-directives-middlewares` you just have to declare, in your schema, the directives in order you want them to take place.

With this declaration:

```gql
type Query {
  users: [User] @auth(requires: ADMIN) @api(name: "users")
}
```

Your `@auth` directive will be called BEFORE the `@api` one.

If you invert `@auth` and `@api`, then `@api` directive will be called BEFORE the `@auth`, without changing your implementation!

## API

### createVisitFieldDefinition

`createVisitFieldDefinition(name: string, impl: (params, next) -> (...args))`

- `name`: the directive name you use in your `gql` schema
- `impl`: is a function that take `params` and `next` and return a function that is your graphql custom resolver
  - `params` are your directives arguments
  - `next` is the next resolver to call, like in a middleware engine

### createVisitObject

`createVisitObject(name: string, impl: (params, next) -> (...args))`

- `name`: the directive name you use in your `gql` schema
- `impl`: is a function that take `params` and `next` and return a function that is your graphql custom resolver
  - `params` are your directives arguments
  - `next` is the next resolver to call, like in a middleware engine

## usage

Example with a `@auth` directive

1. define your directive in the schema

```js
export default `
  enum Role {
    ADMIN
    USER
    VIEWER
  }

  directive @auth(requires: Role = ADMIN) on FIELD_DEFINITION
`
```

2. create your directive implementation

```js
import { GraphQLList } from 'graphql'
import { createVisitFieldDefinition } from 'graphql-directives-middlewares'

export default createVisitFieldDefinition(
  'auth',
  (params, next) => async (...args) => {
    const { requires: requiredRole } = params

    if (!requiredRole) {
      return next()
    }

    const [, , context, definition] = args
    const { role } = context

    if (!role.includes(requiredRole)) {
      if (definition.returnType instanceof GraphQLList) return []
      throw new Error('Unauthorized')
    }

    return next()
  },
)
```

3. bind your directives implementation to your schema

```js
import { makeExecutableSchema } from 'graphql-tools'
import typeDefs from './types'
import auth from './auth'

export default () => {
  const resolvers = {
    Query: {
      users: () => [
        {
          id: 'fabien-juif-1',
          fullName: 'Fabien JUIF',
        },
      ],
    },
  }

  return makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      auth,
    },
  })
}
```

4. use your directives

```js
import { gql } from 'apollo-server'
import user from './user'

export default gql`
  ${user}

  type Query {
    users: [User] @auth(requires: ADMIN)
  }
`
```
