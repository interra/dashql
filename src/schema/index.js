const JSON = require('graphql-type-json')
const { makeExecutableSchema } = require('graphql-tools')
const resolvers = require('./resolvers')

const typeDefs = `
##
# DATA RESOURCES (BETA)
##
enum DataResourceType {
  cartodb
  ckan
  dkan
  postgres
}

type ResponseField {
  field: String!
  type: String!
  required: Boolean!
}

type Response {
  # JSON String  contains raw response data in form:
  # [
  #  { fieldName1:  value, fieldName2: value, ...}
  # ]
  JSONResponse: String
  total_rows: Int
  time: Float # @@TODO get total response time
  fields: [ResponseField]
}

enum ComponentType {
  Chart
  Metric
  Table
  NeighborhoodFilter
}

type Component {
  type: ComponentType!
  componentKey: String!
  data: Response
}

# Type DataResource describes a dataResource:
# An imported set of data which can be queried
# using a sequelize format (BETA)
type DataResource {
  # only cartodb for now
  type: DataResourceType!
  # Canonical identifier for this resource
  resourceHandle: String!
  # Response object containing resource data
  response: Response
}

# Legal filter operations
enum Op {
  LT # Less Than
  GT # Greater Than
  IN # IN
}

# from sequelize
enum FieldType {
	STRING 	
	CHAR 	
	TEXT
	TINYINT
	SMALLINT
	MEDIUMINT
	INTEGER
	BIGINT
	FLOAT
	DOUBLE
	DECIMAL
	REAL
	BOOLEAN
	BLOB
	ENUM
	DATE
	DATEONLY
	TIME
	NOW
	UUID
	UUIDV1
	UUIDV4
	HSTORE
	JSON
	JSONB
	ARRAY
	RANGE
	GEOMETRY
	GEOGRAPHY
	VIRTUAL
}

# Define a dataResource which will be accessible locally 
# for component queries
input ResourceInput {
  type: String! # this is enum in resolvers and should match DataResourceType
  resourceHandle: String! # used to generate memory store
  url: String!
  q: String
  json: Boolean
}

input DataFieldInput {
  resourceHandle: String! # valid resource handle
  field: String! # valid field on DataResource
  type: String! # valid field type based on sequelize field types
  fieldHandle: String # relabel the field for consumption by components
  op: Op
}

# Component definition from client
# queries are executed against fetched dataResources
input ComponentInput {
  type: String! # enum in implementation - a valid component type
  # the name of the resource to query
  resourceHandle: String!
  componentKey: String! # this is a unique string that should map to a dashboard component
  # Select fields from resource
  dataFields: [DataFieldInput]
  # JSON encoding of sequelize where - use any available sequelize operators on query http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
  where: [WhereInput]
  count: String
  # JSON encoding of order http://sequelize.readthedocs.io/en/latest/docs/querying/#ordering
  order: String  
  limit: Int 
}

input WhereInput {
  attribute: String! # The name of the field to use in the where filter
  value: [String]! # The value to filter by
  op: String # Optional operator value - based on http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
}

# Queries persisted dataResources for component-level data
type Query {
  getComponents(components: [ComponentInput]!): [Component]
}

# Fetches top-level data objects from selected backend
# and persists data locally as query-able dataResource
type Mutation {
  populateCartoDataResources(resources: [ResourceInput]!, dataFields: [DataFieldInput]!): [DataResource]
}


`

module.exports = makeExecutableSchema({ typeDefs, resolvers })
