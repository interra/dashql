const { makeExecutableSchema } = require('graphql-tools');
const resolvers = require('./resolvers');

const typeDefs = `
##
# DATA RESOURCES
##
enum dataResourceType {
	cartodb
	csv
	dkan
	ckan
}

type DataResource {
	dataResourceType: dataResourceType!
	resourceHandle: String!
	url: String
}

##
# COMPONENTS
##
type ComponentDataField {
	fieldName: String #the name to apply to the component's data for this field value
	dataResourceHandle: String! # References a valid dataResource
	# @@TODO could dataResourceField be replaced by a GraphQL query?
	dataResourceField: String # Reference to extant field on dataResource
}

enum filterType {
	Autocomplete
	Checkbox
}

type FilterOption {
	label: String
	value: String
}

# from https://www.w3schools.com/sql/sql_operators.asp
enum FilterOperation {
	## Logical Operators
	ALL	#TRUE if all of the subquery values meet the condition
	AND	#TRUE if all the conditions separated by AND is TRUE
	ANY	#TRUE if any of the subquery values meet the condition
	BETWEEN	#TRUE if the operand is within the range of comparisons
	EXISTS	#TRUE if the subquery returns one or more records
	IN	#TRUE if the operand is equal to one of a list of expressions
  NOTIN
	LIKE	#TRUE if the operand matches a pattern
	NOT	#Displays a record if the condition(s) is NOT TRUE
	OR	#TRUE if any of the conditions separated by OR is TRUE
	SOME  #	TRUE if any of the subquery values meet the condition

	## Comparison Operators
	EQ	#Equal to
	GT	#Greater than
	LT  #Less than
	GTEQ #Greater than or equal to
	LTEQ #Less than or equal to
	NOTEQ #Not equal to
}

type Filter {
	type: filterType
  class: String
	filterKey: String! # this needs to be unique amongst fields
	label: String # html label
	willFilter: String # a valid dataResourceHandle
	multi: Boolean # allow multiple filter values
	# @@UMMM could this be a GraphQL query?
	dataResourceField: String # @@UMMM this references a valid
	operation: FilterOperation
	options: [FilterOption]
}

enum visualizationType {
	Chart
	Metric
}

type Component {
	type: visualizationType
	class: String
}

##
# REGIONS
##

type Region {
	id: ID
	children: [Component]! 
}

type Dashboard {
	title: String
	dataResources: [DataResource]
  filters: [Filter]
	regions: [Region]
}

  type Query {
      getDash: Dashboard
  }
`;

    module.exports = makeExecutableSchema({ typeDefs, resolvers });
