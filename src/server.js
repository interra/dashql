const express = require('express')
const bodyParser = require('body-parser')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const schema = require('./schema/index')

const APP_PORT = 3333

const app = express()

app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
app.use('/graphiql', graphiqlExpress({ endpointURL: 'graphql' }))

app.listen(APP_PORT, () => console.log(`GraphiQL is running on http://localhost:${APP_PORT}/graphiql`))
