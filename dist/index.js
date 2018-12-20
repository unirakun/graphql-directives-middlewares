"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createVisitFieldDefinition = void 0;

var _graphql = require("graphql");

var _graphqlTools = require("graphql-tools");

/* eslint-disable no-underscore-dangle */
const resolvers = new Map();

const registerResolver = (directiveName, resolver) => {
  resolver.directiveName = directiveName; // eslint-disable-line no-param-reassign

  resolvers.set(directiveName, resolver);
};

const getMiddlewareResolver = ({
  baseResolver,
  directives,
  params
}) => {
  const middlewares = directives.map(({
    name
  }) => resolvers.get(name.value));
  middlewares.push(() => baseResolver); // this is the final resolver

  return async (...args) => {
    let index = 0;

    const next = async () => {
      const nextMiddleware = middlewares[index];
      index += 1;
      const nextRes = await nextMiddleware(params[nextMiddleware.directiveName], next)(...args);
      return nextRes;
    };

    const res = await next();
    return res;
  };
};

const getResolve = ({
  directiveName,
  args,
  field
}) => {
  const __kmeta = {
    args: {},
    registeredResolversCount: 0,
    baseResolver: field.resolve || _graphql.defaultFieldResolver,
    ...(field.resolve || _graphql.defaultFieldResolver).__kmeta
  };
  __kmeta.registeredResolversCount += 1;
  __kmeta.args[directiveName] = args;
  const {
    astNode
  } = field;
  const {
    directives
  } = astNode;

  if (__kmeta.registeredResolversCount !== directives.length) {
    return {
      __kmeta
    };
  }

  return getMiddlewareResolver({
    directives,
    baseResolver: __kmeta.baseResolver,
    params: __kmeta.args
  });
}; // eslint-disable-next-line import/prefer-default-export


const createVisitFieldDefinition = (directiveName, resolver) => {
  registerResolver(directiveName, resolver);
  return class extends _graphqlTools.SchemaDirectiveVisitor {
    /* eslint-disable no-param-reassign, class-methods-use-this */
    visitFieldDefinition(field) {
      field.resolve = getResolve({
        field,
        directiveName,
        args: this.args
      });
    }

  };
};

exports.createVisitFieldDefinition = createVisitFieldDefinition;