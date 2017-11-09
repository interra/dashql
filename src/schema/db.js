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
const Sequelize = require('sequelize')
const db = require('sqlite')

// CONSTANTS
const CACHE_LIVE_MS = 1 * 60 * 1000 // 10 minutes * 60 sec * milliseconds
const EXPIRY_FIELD = 'expiryTimestamp'
const DEFAULT_ROW_FIELDS = [
  `${EXPIRY_FIELD} INT`
]
const DB_PATH = './database.sqlite'

db.open(DB_PATH)

const sequelize = new Sequelize({
  host: 'localhost',
  dialect: 'sqlite',
  storage: DB_PATH,
  freezeTableName: true
})

/**
 * API
 **/
const insertResource = (resourceHandle, fields, rows) => {
    return new Promise ((resolve, reject) => {
      const Model = _getSequelizeModel(resourceHandle, fields)

      sequelize.sync().then(msg => {
        Model.bulkCreate(rows).then(resolve)
      }).catch(reject)
    }) 
   
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

}



const getComponentData = (component) => {
  const Model = _getSequelizeModel(component.resourceHandle, component.dataFields)

  const data = _sequelizeGetComponentData(Model, component)

  const fields = _sequelizeGetFields(Model)

  return Promise.all([data,fields])
}

/**
 * Helpers
 **/
const sequelizeFields= [
"STRING",
"CHAR",
"TEXT",
"TINYINT",
"SMALLINT",
"MEDIUMINT",
"INTEGER",
"BIGINT",
"FLOAT",
"DOUBLE",
"DECIMAL",
"REAL",
"BOOLEAN",
"BLOB",
"ENUM",
"DATE",
"DATEONLY",
"TIME",
"NOW",
"UUID",
"UUIDV1",
"UUIDV4",
"HSTORE",
"JSON",
"JSONB",
"ARRAY",
"RANGE",
"GEOMETRY",
"GEOGRAPHY",
"VIRTUAL",
]

const _getTableDef = (fields) => {
  const _fields = fields.map(field => {
    const fieldType = sequelizeFieldMappings[field.fieldType] || 'STRING'
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
  
}

// old implementation
const __doInsertResource = (resourceHandle, rows) => {
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

const _sequelizeGetComponentData = (Model, component) => {
  console.log("gCD-db1")
  // build select from datafields
  let options = {}
  
  // add WHERE from filters
  if (component.where) {
    options.where = JSON.parse(component.where)
  }

  // add ORDER
  if (component.order) {
    options.order = JSON.parse(component.order)
  }
  
  // add LIMIT
  if (component.limit) {
    options.limit = component.limit
  }
  
  return Model.findAll(options)
}

// get sql defs from sequelize and return
// fields array for graphql api
const _sequelizeGetFields = (Model) => {
  return new Promise((resolve, reject) => {
    Model.describe()
      .then(sqlDefs => {
      const fields = Object.keys(sqlDefs).map(key => {
        return {
          field: key,
          type: sqlDefs[key].type,
          nullable: sqlDefs[key].allowNull
        }
      })
      console.log('f', fields)
      resolve(fields)
    })
    .catch(err => reject)
  })
}

const _getSequelizeModel = (resourceHandle, fields) => {
  // build sequelize model
  console.log('db2')
  let modelDef = fields.reduce((acc, item) => {
    const fieldType = item.type
    let _acc = Object.assign({}, acc)
    _acc[item.field] = {
      type: fieldType,
      tableName: item.resourceHandle,
    }

    return _acc
  }, {})

  console.log("db2.1", resourceHandle, modelDef)
   
  const Model = sequelize.define(resourceHandle, modelDef)
  const FOO = sequelize.define('foo', {foo: Sequelize.STRING})
  
  return Model 
}

const _log = () => {
  //@@TODO implement logging
  // console.log(arguments)
}

module.exports = {
  insertResource: insertResource,
  getComponentData: getComponentData,
}
