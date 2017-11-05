const _ = require('lodash');
// Sample data
const { dash } = require('./../data/data');
const rp = require('request-promise')

const resolvers = {
    Query: {
      // fetch data
      // and parse as cartodb api response
      getDataResources: (_, {resources}) => {
        const all = resources.map(resource => {
        
        switch (resource.type) {
          case 'cartodb':
            return _fetchCartoResource(resource)

          default:
            return {
              type: 'unknown', // this will throw graphQL type exception
              resourceHandle: resource.resourceHandle
            }
        }
      })

      return Promise.all(all)
    }
  }
}

const _fetchCartoResource = module.exports._fetchCartoResource = (resource) => {
    return new Promise((resolve, reject) => {
      rp({
        uri: resource.url + resource.q,
        json: resource.json
      }).then(json => {
        const response = _parseCartoResponse(json)
        const dataResource =
        {
          response: response,
          type: 'cartodb',
          resourceHandle: resource.resourceHandle
        }
        resolve(dataResource)
      }).catch(err => {
        reject(err)
      })
    })
}

const _parseCartoResponse = module.exports._parseCartoResponse = (_r) => {
  const response = JSON.parse(_r)
  const rows = response.rows.map(JSON.stringify)
  const total_rows = parseInt(response.total_rows)
  const time = parseFloat(response.time)
  const _fields = Object.keys(response.fields)
  const fields = _fields.map(field => {
    return {
      fieldName: field,
      fieldType: response.fields[field].type
    }

  })
  console.log(rows, total_rows, time, fields)

  return {
    type: 'cartodb',
    rows: rows,
    total_rows: total_rows,
    time: time,
    fields: fields
  }
}

module.exports = resolvers;
