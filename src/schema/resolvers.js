const _ = require('lodash')
const rp = require('request-promise')
const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database(':memory:')

const resolvers = {
    Query: {
      // fetch data
      // and parse as cartodb api response
      getDataResources: (_, {resources}) => {
        console.log('gDR', resources)
        const all = resources.map(resource => {
        
        switch (resource.type) {
          case 'cartodb':
            // check for resource in sqlite3
            // check expiry
            // if valid
            //    load and send
            // else
            //    _fetchCartoResource(resource)
            //    fire non-blocking write of data to sqlite3
            //    return resource
            return _fetchCartoResource(resource)

          default:
            return {
              type: 'unknown', // this will throw graphQL type exception
              resourceHandle: resource.resourceHandle
            }
          }
        })

        return Promise.all(all)
      },

      getComponents: (_, {components}) => {
        console.log('gc', components)
        const all = components.map(component => {
          console.log(component.type)
          switch (component.type) {
            // should implement schema: enum ComponentType
            case 'Nvd3Chart':
              return _getNvd3ChartData(component)
            case 'Nvd3PieChart':
              return _getNvd3PieChartData(component)
            case 'Metric':
              return _getMetricData(component)
            default:
              return {
                type: 'unknown'
              }
          }
        })

      return Promise.all(all)
    }
  }
}

/**
 * DataResource fetchers
 **/
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

  return {
    type: 'cartodb',
    rows: rows,
    total_rows: total_rows,
    time: time,
    fields: fields
  }
}

/**
 * Component Type Handlers
 **/

const _getNvd3ChartData = module.exports._getNvd3ChartData = (component) => {
  return new Promise((resolve, reject) => {
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
