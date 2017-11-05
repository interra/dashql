const JSON = require('graphql-type-json')
const { makeExecutableSchema } = require('graphql-tools')
const resolvers = require('./resolvers')

const typeDefs = `
##
# DATA RESOURCES
##

enum DataResourceType {
  cartodb
  ckan
  dkan
  postgres
}

enum ResponseFieldType {
  number
  string
  boolean
  date
  geometry
}

type ResponseField {
  fieldName: String
  fieldType: ResponseFieldType
}

type Response {
  rows: [String] # array of json strings containing response data
  total_rows: Int
  time: Float
  fields: [ResponseField]
}

type DataResource {
  type: DataResourceType!
  resourceHandle: String!
  response: Response
}

enum Op {
  LT
  GT
  IN
}

input Filter {
  op: Op # valid sql operator
  field: String # field on dataResource
  type: String # this is enum in resolver
  vals: String # serialized JSON
}

input Resource {
  resourceHandle: String! # used to generate memory store
  type: String! # this is enum in resolvers
  url: String!
  q: String
  json: Boolean
}

type Query {
  getDataResources(resources: [Resource], filter: [Filter]): [DataResource]
}
`

module.exports = makeExecutableSchema({ typeDefs, resolvers })
