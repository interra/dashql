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
  responseType: String
  total_rows: Int
  time: Float # @@TODO get total response time
  fields: [ResponseField]
}

enum ComponentType {
  Chart
  ChartNVD3
  Metric
  MetricSelect
  Table
  NeighborhoodFilter
}

type Component {
  type: ComponentType!
  componentKey: String!
  data: Response
}

enum ResponseType {
  JSONResponse
}

type DataResponse {
  data: Response
  responseType: ResponseType!
  componentKey: String!
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
  group: String
  # JSON encoding of order http://sequelize.readthedocs.io/en/latest/docs/querying/#ordering
  order: OrderInput
  limit: Int 
}

input WhereInput {
  attribute: String! # The name of the field to use in the where filter
  value: [String]! # The value to filter by
  op: String # Optional operator value - based on http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
}

input OrderInput {
  attribute: String! # The name of the field to use in the order clause
  order: String! # ASC or DESC
}

# Queries persisted dataResources for component-level data
type Query {
  getComponents(components: [ComponentInput]!): [Component]
  getServiceNumbersByNeighborhood(serviceName: String!, componentKey: String! ): DataResponse
  getOutstandingRequests(serviceName: String!, componentKey: String!, limit: Int! ): DataResponse
  getCapsByDistrict(complaintType: String, componentKey: String! ): DataResponse
}


# Fetches top-level data objects from selected backend
# and persists data locally as query-able dataResource
type Mutation {
  populateCartoDataResources(resources: [ResourceInput]!, dataFields: [DataFieldInput]!): [DataResource]
}


`

module.exports = makeExecutableSchema({ typeDefs, resolvers })
