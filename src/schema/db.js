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

/**
 * API
 **/
const getComponentData = (component) => {
  const dataFields = component.dataFields || []
  const Model = _getSequelizeModel(component.resourceHandle, dataFields)

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
  console.log("CCCC", component)
  // build select from datafields
  let options = {}
  const where = component.where || []
  const neighborhoods= where.filter(w => w && w.attribute === "neighborhood")
  const whereArr = where.filter(w => w && w.attribute !== "neighborhood")
  
  options.attributes = []
  
  // add ORDER
  if (component.order) {
    console.log('this order', component.order)
    options.order = [component.order.attribute, component.order.order]
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
  if (where.length > 0) {
    options.where = {}

    // pull out neighborhood stuff and handle
    // separately

    whereArr.forEach(wh => {
      const attr = wh.attribute
      const val = wh.value

      if (wh.op) {
        const operator = Op[wh.op]
        const attr = wh.attribute
        const val = wh.value
        console.log("op", operator,attr,val)
        options.where[attr] = {}
        options.where[attr][operator] = val
      } else {
        options.where[attr] = val
      }
    })
  }

  if (component.count) {
    options.attributes.push([sequelize.fn('COUNT', sequelize.col(component.count)), 'count'])
    options.group = [component.count]
  }

  if (component.dataFields) {
    component.dataFields.forEach(field => {
      console.log("datafields", field)
      options.attributes.push(field.field)
    })
  }

  if (component.order) {
    console.log("ORDER>>>>", component.order)
    options.order = [ [component.order.attribute, component.order.order] ]
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

// reference this works!
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

  let groupByMatch, limitMatch

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

    // move GROUP BY and LIMIT clause to end of query
    groupByMatch = newQuery.match(/GROUP BY ".+"/) || []
    limitMatch = newQuery.match(/LIMIT \d+/) || []
    orderByMatch = newQuery.match(/ORDER BY .+ ASC|DESC/) || []

    const reordered = newQuery
      .replace(groupByMatch[0] || '', '')
      .replace(orderByMatch[0] || '', '')
      .replace(limitMatch[0] || '', '')
      .concat(` ${groupByMatch}`)
      .concat(` ${orderByMatch}`)
      .concat(` ${limitMatch}`).concat(';')

    console.log('NN', reordered)
    return reordered
  }
  
  return raw
}

const getServiceNumbersByNeighborhood = (service) => {
  const sql = `SELECT * FROM neighb_counts WHERE service_name = '${service}'`

  return sequelize.query(sql)
}

const getOutstandingRequests = (service, limit) => {
  const sql = `SELECT * FROM philly_311 WHERE status = 'Open' AND service_name = '${service}' ORDER BY requested_datetime ASC limit ${limit}`
  
  return sequelize.query(sql)
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
  getComponentData: getComponentData,
  getOutstandingRequests: getOutstandingRequests,
  getServiceNumbersByNeighborhood: getServiceNumbersByNeighborhood
}
