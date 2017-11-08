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
  field: String
  type: ResponseFieldType
}

type Response {
  JSONResponse: String #  json array containing response data
  total_rows: Int
  time: Float # @@TODO get total response time
  fields: [ResponseField]
}

enum ComponentType {
  Nvd3Chart
  Nvd3PieChart
  Metric
}

type Component {
  type: ComponentType!
  data: Response
}

type DataResource {
  type: DataResourceType!
  resourceHandle: String!
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

# Filter interface is used as an input parameter
# for dataResources AND components
type Filter {
  op: Op # legal operation
  field: String # field on dataResource
  vals: String # serialized JSON
}

# Filter interface is used as an input parameter
# for dataResources AND components
input FilterInput {
  op: String # valid sql operator -- use op enum in implementation
  field: String # field on dataResource
  vals: String # serialized JSON
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
  type: String! # valid field type
  fieldHandle: String # relabel the field for consumption by components
  op: Op
}

# Component definition from client
# queries are executed against fetched dataResources
input ComponentInput {
  type: String! # enum in implementation - a valid component type
  resourceHandle: String!
  dataFields: [DataFieldInput]!
  where: String # JSON encoding of sequelize where
  order: String # JSON encoding of sequelize order http://sequelize.readthedocs.io/en/latest/docs/querying/#ordering
  limit: Int # JSON encoding of sequelize limit
}

type Query {
  # query persisted dataResources for component-level data
  # returns data of shape required by component-type specified
  getComponents(components: [ComponentInput]!): [Component]
}

type Mutation {
  # fetch top-level data objects from selected backend
  # dataResources and persist locally
  populateCartoDataResources(resources: [ResourceInput]!, dataFields: [DataFieldInput]!, filters: [FilterInput]): [DataResource]
}


`

module.exports = makeExecutableSchema({ typeDefs, resolvers })
