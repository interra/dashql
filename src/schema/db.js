const Sequelize = require('sequelize')
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

// note -we are currently doing resource 
// insertion via a node module
// not via API
const insertResource = () => {
  return 'NOT IMPLEMENTED'
}

/**
 * API
 **/
const getComponentData = (component) => {
  const Model = _getSequelizeModel(component.resourceHandle, component.dataFields)

  const data = _sequelizeGetComponentData(component)
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

const _sequelizeGetComponentData = (component) => {
  // build select from datafields
  let options = {}
  const where = component.where || []
  const neighborhoods= where.filter(w => w.attribute === "neighborhood")
  const whereArr = where.filter(w => w.attribute !== "neighborhood")
  
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
  if (where) {
    options.where = {}

    // pull out neighborhood stuff and handle
    // separately

    whereArr.forEach(wh => {
      const attr = wh.attribute
      const val = wh.value
      const $in = Op.in

      if (wh.opName) {
        const operator = Op[wh.opName]
        const attr = wh.attribute
        const val = wh.value
        options.where[wh.attribute] = {
          operator : val
        }
      } else {
        options.where[attr] = val
      }
    })
  }

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

// this works!
 const mock = 'SELECT "service_name", count("service_name") AS "count" FROM philly_311 WHERE (ST_Contains(ST_SetSRID((SELECT the_geometry FROM neighborhoods WHERE name=\'MANTUA\'),4326), ST_SetSRID(philly_311.the_geom, 4326))=true OR ST_Contains(ST_SetSRID((SELECT the_geometry FROM neighborhoods WHERE name=\'MANTUA\'),4326), ST_SetSRID(philly_311.the_geom, 4326))=true OR ST_Contains(ST_SetSRID((SELECT the_geometry FROM neighborhoods WHERE name=\'CEDAR_PARK\'),4326), ST_SetSRID(philly_311.the_geom, 4326))=true) GROUP BY "service_name";' 

  const raw = sequelize.dialect.QueryGenerator.selectQuery(component.resourceHandle, options)
  const withgis = spliceGISQuery(raw, neighborhoods)
  console.log('WITHGIS', withgis)
  return sequelize.query(withgis)
}

// INSERT POSTGIS Query into raq sequelize query
const spliceGISQuery = (_raw, neighborhoods) => {
  const raw = _raw.slice(0,-1)  // remove trailing ;

  const insert = (str, index, value) => {
    return str.substr(0, index) + value + str.substr(index);
  }

  if (neighborhoods.length > 0) {
    let newQuery = ""
    const hoods = neighborhoods[0].value
    const gisQueryParts = hoods.map(ng => {
      return `ST_Contains(ST_SetSRID((SELECT the_geometry FROM neighborhoods WHERE name=\'${ng}\'),4326), ST_SetSRID(philly_311.the_geom, 4326))=true`
  }, '')

    const gisWHEREClause = `(${gisQueryParts.join(' OR ')})`
    const WHEREIndex = raw.indexOf('WHERE') + 5 // add 5 so that it goes AFTER the WHERE

    if (WHEREIndex > 5) {
      newQuery = insert(raw, WHEREIndex, `${gisWHEREClause} AND `)
    } else {
      newQuery = raw.concat(` WHERE ${gisWHEREClause}`)
    }

    // move GROUP BY clause
    const groupByMatch = newQuery.match(/GROUP BY ".+"/)
    if (groupByMatch) {
      newQuery.replace(groupByMatch, '').concat(` ${groupByMatch}`)
    }
    
    // move LIMIT clause to end of query
    const limitMatch = newQuery.match(/LIMIT \d+/)
    if (limitMatch) {
      newQuery.replace(limitMatch,'').concat(` ${limitMatch}`).concat(';')
    }

    return newQuery
  }
  
  return raw
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
  
  return Model 
}

module.exports = {
  insertResource: insertResource,
  getComponentData: getComponentData,
}
