/**
 e This isn't really a persistence layer - * We should be able to regenerate this data at any time
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
const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres', 
  {
    logging: false,
    pool: {
      max: 10, 
      min: 0,
      idle: 20000,
      acquire: 20000
    }   
  })

const Op = sequelize.Op

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
  // build select from datafields
  let options = {}
  
  // add ORDER
  if (component.order) {
    options.order = JSON.parse(component.order)
  }
  
  // add LIMIT
  if (component.limit) {
    options.limit = component.limit
  }
  
  /**
   * ADD WHERE
   * http://docs.sequelizejs.com/manual/tutorial/querying.html
   *
   * we are looking for component such as:
   * {
   * where: [
   * {
   * attribute: "service_name",
   * value: "Abandoned Vehicle"
   * },
   * {
   * opName: "or",
   * attribute: "agency_responsible",
   * value: ["Parks and Recreation", "Public Health"]
   * }, 
   * {
   *  opName: "gte",
   * attribute: "requested_datetime",
   * value: "Fri Dec 01 2017 17:11:59 GMT-0500 (EST)"
   * }
   * ]
   * }
   **/ 
  if (component.where) {
    console.log("WHERE 1", component)
    options.where = {}

    // pull out neighborhood stuff and handle
    // separately
    const neighborhoodArr = component.where.filter(w => w.attribute === "neighborhood")
    const whereArr = component.where.filter(w => w.attribute !== "neighborhood")

    console.log("NEIGHBORHOODS", neighborhoodArr)
    console.log("NOT NEIGH", whereArr.length)
    
    whereArr.forEach(wh => {
      const attr = wh.attribute
      const val = wh.value
      const $in = Op.in

      console.log('>>>', wh)
      if (wh.opName) {
        const operator = Op[wh.opName]
        const attr = wh.attribute
        const val = wh.value
        options.where[wh.attribute] = {
          operator : val
        }
      } else {
        console.log("No WHERE OP", attr, val)
        options.where[attr] = val
      }
    })
  }

  console.log("WHERE 2", options)
  
  if (component.count) {
    options.attributes = [component.count, [sequelize.fn('count', sequelize.col(component.count)), 'count']]
    options.group = [component.count]
  }

  
  // ADD GROUP BY
  /*
  if (component.group) {
    options.group = component.group
  }
  
  if (component.aggregate) {
    // @@TODO Implement
  }
  */
  
  const raw = sequelize.dialect.QueryGenerator.selectQuery(component.resourceHandle, options)
  console.log("RAW", raw)
  return sequelize.query(raw)
  // Model.findAll(options) // the old way using model findall
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
      resolve(fields)
    })
    .catch(err => reject)
  })
}

const _getSequelizeModel = (resourceHandle, fields) => {
  // build sequelize model
  let modelDef = fields.reduce((acc, item) => {
    const fieldType = item.type
    let _acc = Object.assign({}, acc)
    _acc[item.field] = {
      type: fieldType,
      tableName: item.resourceHandle,
    }

    _acc.createdAt = {
        type: Sequelize.DATE,
        field: 'created_at'
    }

    _acc.updatedAt = {
        type: Sequelize.DATE,
        field: 'updated_at'
    }

    return _acc
  }, {})

  const Model = sequelize.define(resourceHandle, modelDef, {freezeTableName: true})
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
