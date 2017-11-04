const { makeExecutableSchema } = require('graphql-tools')
const { dash } = require('../data/data')
console.log(dash.title)
const typeDefs = `

type Dashboard {
	title: String
#	dataResources: [DataResource]
#	regions: [Region]
}

type Query {
  getDashboard: Dashboard
}
`
const resolvers = {
  Query: {
    getDashboard: () => {title: "FOO"}
  }
}
module.exports = makeExecutableSchema({ typeDefs, resolvers })
