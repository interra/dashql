const _ = require('lodash')
const md5 = require('md5')
const rp = require('request-promise')
const db = require('./db')
const redis = require('redis')
const stringify = require('json-stringify')
const EXPIRY =  360
const REDISPORT =  6379
const rc = redis.createClient(REDISPORT)

const getCache = (key) => {
  return new Promise((resolve, reject) => {
      rc.get(key, (err, res) => {
      if (err) reject(err)
      resolve(res)
    })
  })
}

const cacheWrite = (key, data) => {
  rc.set(key, data)
}

const resolvers = {
    Query: {
      /**
       * @TODO - This is a user implentation
       * We need a mechanism for extending the
       * ODV default API with user jawns
       */
      getServiceNumbersByNeighborhood: (_, req) => {
        const cacheKey = (md5(JSON.stringify(req)));
        return new Promise ((resolve, reject) => {
          getCache(cacheKey).then(cache => {
          
          if (cache) {
            const APIRes= {
              data: {
                JSONResponse: cache
              },
              componentKey: req.componentKey,
              responseType: "JSONResponse"
            }
            resolve(APIRes)
          } else {

              db.getServiceNumbersByNeighborhood(req.serviceName)
              .then(res => {
                const jsonData = JSON.stringify(res[0])
                cacheWrite(cacheKey, jsonData)
                const APIRes =
                {
                  data: {
                    JSONResponse: JSON.stringify(res[0])
                    },
                  componentKey: req.componentKey,
                  responseType: "JSONResponse"
                }
                // cache write APIRes
                resolve(APIRes)
              })
              .catch(reject)
          }
        })
        .catch(console.log)
      })
    }, 
    
  /**
   * @TODO - This is a user implentation
   * We need a mechanism for extending the
   * ODV default API with user jawns
   */
    getCapsByDistrict: (_, req) => {
      console.log(req)
      const mock = {
        data: {
          JSONResponse: JSON.stringify({foo:"bar"})
        },
        componentKey: req.componentKey,
        responseType: "JSONResponse"
      }
      
      // @TODO implement cache:
      const cacheKey = (md5(JSON.stringify(req)));
      
      return new Promise ((resolve, reject) => {
        db.getCapsByDistrict(req.complaintType)
        .then(res => {
          console.log("Caps", res)
          const data = res[0]
          const fields = res[1]
          const dataJson = stringify(data)
          resolve({
            data: {
              JSONResponse: dataJson
            },
            componentKey: req.componentKey,
            responseType: "JSONResponse",
            fields: fields
          })
        })
        .catch(reject)
      })
    },
      
  /**
   * @TODO - This is a user implentation
   * We need a mechanism for extending the
   * ODV default API with user jawns
   */
    getOutstandingRequests: (_, req) => {
        return new Promise ((resolve, reject) => {
          db.getOutstandingRequests(req.serviceName, req.limit)
            .then(res => {
              resolve({
                data: {
                  JSONResponse: JSON.stringify(res[0])
                  },
                componentKey: req.componentKey,
                responseType: "JSONResponse"
              })
            })
            .catch(reject)
        })
      }, 


      /**
       * @@TODO DOCUMENT
       *
       * This is part of the stable API for
       * ODV and should be documented and
       * ship with the library
       **/
      getComponents: (_, {components}) => {
        const all = components.map(component => {
        const cacheKey = (md5(JSON.stringify(component)));
          return new Promise ((resolve, reject) => {
          getCache(cacheKey).then(cache => {
          
          if (cache) {
            const APIRes= {
              type: component.type,
              componentKey: component.componentKey,
              data: {
                JSONResponse: cache
              },
              responseType: "JSONResponse"
            }
            resolve(APIRes)
          } else {
              db.getComponentData(component)
             .then( (res) => {
                const data = res[0]
                const fields = res[1]
                const dataJson = stringify(data)
                cacheWrite(cacheKey, dataJson)
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
            }
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
