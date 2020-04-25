"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createVisitObject = exports.createVisitFieldDefinition = void 0;

var _graphql = require("graphql");

var _graphqlTools = require("graphql-tools");

/* eslint-disable import/no-extraneous-dependencies, no-underscore-dangle */
// we can modify graphql inner object with symbol making sure we don't override fields
// right now or in futur releases
const metaKey = Symbol();
const resolvers = new Map();

const registerResolver = (directiveName, resolver) => {
  resolver.directiveName = directiveName;
  resolvers.set(directiveName, resolver);
};

const getResolve = ({
  directiveName,
  params,
  field,
  middleware
}) => {
  if (!field[metaKey]) {
    field[metaKey] = {
      baseResolver: field.resolve || _graphql.defaultFieldResolver,
      middlewares: []
    };
  }

  let calls = -1;
  field[metaKey].middlewares.push({
    name: directiveName,
    impl: middleware,
    params
  }); // next function is recursive, it give the resolve args to each middleware

  const next = (...args) => async () => {
    calls += 1; // at the end we call the real resolver

    if (calls === field[metaKey].middlewares.length) {
      return field[metaKey].baseResolver(...args);
    } // take the next middleware and try to call it


    const middleware = field[metaKey].middlewares[calls];
    if (!middleware) return;
    return middleware.impl(middleware.params, next(...args))(...args);
  };

  return (...args) => next(...args)();
};

const createVisitFieldDefinition = (directiveName, middleware) => {
  registerResolver(directiveName, middleware);
  return class extends _graphqlTools.SchemaDirectiveVisitor {
    /* eslint-disable class-methods-use-this */
    visitFieldDefinition(field) {
      const {
        args: params
      } = this;
      field.resolve = getResolve({
        field,
        directiveName,
        params,
        middleware
      });
    }

  };
};

exports.createVisitFieldDefinition = createVisitFieldDefinition;

const createVisitObject = (directiveName, middleware) => {
  registerResolver(directiveName, middleware);
  return class extends _graphqlTools.SchemaDirectiveVisitor {
    visitObject(type) {
      const fields = type.getFields();
      const {
        args: params
      } = this;
      Object.values(fields).forEach(field => {
        field.resolve = getResolve({
          field,
          directiveName,
          params,
          middleware
        });
      });
    }

  };
};

exports.createVisitObject = createVisitObject;