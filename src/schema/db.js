/**
 * This isn't really a persistence layer -
 * We should be able to regenerate this data at any time
 *
 * The database layer acts as more of a cache
 * Once data is fetched we import it here for use in subqueries
 *
 * This is a naive implementation - we will need to optimize / scale this
 * 
 * Also - this should function for multiple backends - not just cartodb
 *
 * We could also keep this db cache 'warm' by doing requests via cron or others
 **/
const sql = require('sequelize')
const db = require('sqlite')

// CONSTANTS
const CACHE_LIVE_MS = 1 * 60 * 1000 // 10 minutes * 60 sec * milliseconds
const EXPIRY_FIELD = 'expiryTimestamp'
const DEFAULT_ROW_FIELDS = [
  `${EXPIRY_FIELD} INT`
]

db.open('./database.sqlite')

/**
 * API
 **/

const insertResource = (resourceHandle, fields, rows) => {
  return new Promise((resolve, reject) => {
  
  // @@TODO add drop table to transaction we don't want old data
  
  _createResourceTableIfNotExists(resourceHandle, fields)
    .then(msg => {
        _getCacheExpiry(resourceHandle).then(expiry => {
          const expires = (expiry) ? expiry[EXPIRY_FIELD] : 0 // reset cache if table no exists
          const isStale = Date.now() > expires
          console.log("cache", "now", Date.now(), resourceHandle, expires , isStale)
          if (isStale) {
            _doInsertResource(resourceHandle, rows)
              .then(success => {
                resolve(success)
              })
              .catch(err => {
                _log("Fails to _doInsertResource", err)
                reject(err)
              }) // catch _doInsertResource
          } else {
            // do nothing if the cache is still valid
            _log("cache still valid", resourceHandle)
            resolve("true")
          }
        }) 
        .catch(err => {
          _log(err)
          reject(err)
        })  // catch check cache
      })

    .catch(err => {
      _log("error creating resource table", err)
      reject(err)
    }) // catch _createResourceTableIfNotExists
  })
}

// This is a naive implementation
// Really what we need here is a robust tool
// that maps [DataFeeld] definitions to
// a query
const getComponentData = (component) => {
  const qs = component.dataFields.map(dataField => {
    return `${dataField.field} AS ${dataField.fieldHandle}`
  }).join(',')
   
  console.log("component Data", qs)
  return db.all(`SELECT ${qs} FROM byServiceName`)
}

/**
 * Helpers
 **/
// map from carto field definitions to sqlite3
const fieldMappings = {
  string: 'TEXT',
  number: 'REAL'
}

const _getTableDef = (fields) => {
  const _fields = fields.map(field => {
    const fieldType = fieldMappings[field.fieldType] || 'VARCHAR'
    return field.fieldName + ' ' + fieldType
  })

  const __fields = _fields.concat(DEFAULT_ROW_FIELDS)
  _log("fieldDef Array", __fields)
  
  return __fields.join(',')
}

const _createResourceTableIfNotExists = (resourceHandle, fields) => {
  const tableDef = _getTableDef(fields)
  console.log(resourceHandle, tableDef)
  return db.run(`CREATE TABLE IF NOT EXISTS ${resourceHandle} (${tableDef})`) 
}

const _getCacheExpiry = (resourceHandle, expiry) => {
  return db.get(`SELECT ${EXPIRY_FIELD} FROM ${resourceHandle} LIMIT 1`)
}

const _doInsertResource = (resourceHandle, rows) => {
        // @@TODO we need to check if the schema has changed / do schema validation
        const expiry = Date.now() + CACHE_LIVE_MS
        
        db.run('BEGIN TRANSACTION')
        db.run(`DELETE FROM ${resourceHandle}`)
        
        rows.forEach(row => {
          // add expiry value to values
          const values = Object.values(row).concat(expiry).map(v => `'${v}'`).join(',')

          db.run(`INSERT INTO ${resourceHandle} VALUES (${values})`)
        })
        
        return db.run('COMMIT')
}

const _log = () => {
  //@@TODO implement logging
  // console.log(arguments)
}

module.exports = {
  insertResource: insertResource,
  getComponentData: getComponentData
}
