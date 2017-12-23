const _ = require('lodash')
const rp = require('request-promise')
const db = require('./db')
const stringify = require('json-stringify')
const EXPIRY = 360

const resolvers = {
    Query: {
      getServiceNumbersByNeighborhood: (_, req) => {
        return new Promise ((resolve, reject) => {
          db.getServiceNumbersByNeighborhood(req.serviceName)
            .then(res => {
              resolve({
                data: {
                  JSONResponse: JSON.stringify(res[0])
                  },
                componentKey: req.componentKey
              })
            })
            .catch(reject)
        })
      }, 
      
      getOutstandingRequests: (_, req) => {
        return new Promise ((resolve, reject) => {
          db.getOutstandingRequests(req.serviceName, req.limit)
            .then(res => {
              console.log("OUTS", res)
              resolve({
                data: {
                  JSONResponse: JSON.stringify(res[0])
                  },
                componentKey: req.componentKey
              })
            })
            .catch(reject)
        })
      }, 


      
      getComponents: (_, {components}) => {
        const all = components.map(component => {
          return new Promise ((resolve, reject) => {
              db.getComponentData(component)
             .then( (res) => {
                const data = res[0][0]
                const fields = res[1]
                const dataJson = stringify(data)

                resolve({
                  type: component.type,
                  componentKey: component.componentKey,
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

const _addCartoResourceToDB = module.exports = (dataResource) => {
  const rows = JSON.parse(dataResource.response.JSONResponse)
  const fields = dataResource.response.fields.map(field => {
    field.type = _cartoToSequelizeMap[field.type]
    return field 
  })
  return db.insertResource(dataResource.resourceHandle, fields, rows)
}

module.exports = resolvers;
