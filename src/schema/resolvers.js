const _ = require('lodash')
const rp = require('request-promise')
const db = require('./db')
const stringify = require('json-stringify')
const EXPIRY = 360

const resolvers = {
    Mutation: {
      // fetch data
      // and parse as cartodb api response
      populateCartoDataResources: (_, {resources}) => {
        console.log('gDR')
        const all = resources.map(resource => {
        
        switch (resource.type) {
          case 'cartodb':
            console.log(1);
            return _fetchCartoResource(resource)

          default:
            return {
              type: 'unknown', // this will throw graphQL type exception
              resourceHandle: resource.resourceHandle
            }
          }
        })

        console.log(2.5, all)

        return Promise.all(all)
      },
    },

    Query: {
      getComponents: (_, {components}) => {
        console.log('gcD0')
        const all = components.map(component => {
          return new Promise ((resolve, reject) => {
              db.getComponentData(component)
             .then( (res) => {
                const data = res[0]
                const fields = res[1]
                console.log('gcD-rs-1', fields)
                const dataJson = stringify(data)
                console.log(typeof dataJson)

                resolve({
                  type: component.type,
                  data: {
                    JSONResponse: dataJson,
                    total_rows: data.length,
                    fields: fields
                  }
                })
              })
              .catch(err => {
                reject(err)
            })
          })
        })

        return Promise.all(all)
    }
  }
}

/**
 * CARTO DataResource fetchers
 ***/
const _fetchCartoResource = module.exports._fetchCartoResource = (resource) => {
    return new Promise((resolve, reject) => {
      console.log('fetch---')
      rp({
        uri: resource.url + resource.q,
        json: resource.json
      }).then(json => {
        console.log(2)
        const response = _parseCartoResponse(json)
        const dataResource =
        {
          response: response,
          type: 'cartodb',
          resourceHandle: resource.resourceHandle
        }
        
        _addCartoResourceToDB(dataResource).then(res => {
          resolve(dataResource)
        }).catch(err => {
          reject(err)
        })

      }).catch(err => {
        reject(err)
      })
    })
}

const _parseCartoResponse = module.exports._parseCartoResponse = (_r) => {
  const response = JSON.parse(_r)
  const JSONResponse = stringify(response.rows)
  const total_rows = parseInt(response.total_rows)
  const time = parseFloat(response.time)
  const _fields = Object.keys(response.fields)
  const fields = _fields.map(field => {
    return {
      field: field,
      type: response.fields[field].type
    }
  })
  
  console.log(2.4, fields)
  return {
    type: 'cartodb',
    JSONResponse: JSONResponse,
    total_rows: total_rows,
    time: time,
    fields: fields
  }
}

_cartoToSequelizeMap = {
  string: 'STRING',
  number: 'REAL'
}
// @@TODO logging
const _addCartoResourceToDB = module.exports = (dataResource) => {
  const rows = JSON.parse(dataResource.response.JSONResponse)
  const fields = dataResource.response.fields.map(field => {
    console.log('>>>>>>', field)
    field.type = _cartoToSequelizeMap[field.type]
    console.log('>>', field)
    return field 
  })
  console.log("FFF", fields)
  return db.insertResource(dataResource.resourceHandle, fields, rows)
}

/**
 * Component Type Handlers
 *
 * This could be in another library
 * Also could be in the client
 **/
const formatComponentData = (type, data) => {
  // @@implement
  return data
}

const _getNvd3ChartData = module.exports._getNvd3ChartData = (component) => {
  return new Promise ((resolve, reject) => {
    resolve({
      type: "Nvd3Chart"
    })
  })
}

const _getNvd3PieChartData = module.exports._getNvd3PieChartData = (component) => {
  return new Promise ((resolve, reject) => {
    resolve({
      type: "Nvd3PieChart"
    })
  })
}

const _getMetricData = module.exports._getMetricData = (component) => {
  return new Promise ((resolve, reject) => {
    resolve({
      type: "Metric"
    })
  })
}

module.exports = resolvers;
