const conf = require('../../config.json')
const Sequelize = require('sequelize')
const sequelize = new Sequelize(conf.dbConnect, conf.dbCons)
const Op = sequelize.Op

/**
 * API
 **/
const getComponentData = (component) => {
  const dataFields = component.dataFields || []
  const Model = _getSequelizeModel(component.resourceHandle, dataFields)
  const data = _sequelizeGetComponentData(component, Model)
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

const _sequelizeGetComponentData = (component, Model) => {
  // build select from datafields
  let options = {}
  const where = component.where || []
  const neighborhoods= where.filter(w => w && w.attribute === "neighborhood")
  const whereArr = where.filter(w => w && w.attribute !== "neighborhood")
  
  options.attributes = []
  
  // add ORDER
  if (component.order) {
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
      options.attributes.push(field.field)
    })
  }

  if (component.order) {
    options.order = [ [component.order.attribute, component.order.order] ]
  }


  if (component.group) {
    options.group = component.group
  }
  
  if (component.aggregate) {
    // @@TODO Implement
  }
  
  const result = Model.findAll(options)
  return result

  // const raw = sequelize.dialect.QueryGenerator.selectQuery(component.resourceHandle, options)
  // const withgis = spliceGISQuery(raw, neighborhoods)
  // return sequelize.query(withgis)
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

    return reordered
  }
  
  return raw
}

/**
 * USER
 **/
const getServiceNumbersByNeighborhood = (service) => {
  const sql = `SELECT neighb_counts.*, (neighborhoods_import.shape_area * 0.00000038610215) AS sqmi, ( neighb_counts.count / (neighborhoods_import.shape_area * 0.00000038610215)) AS rate FROM neighb_counts, neighborhoods_import WHERE neighb_counts.neighborhood = neighborhoods_import.name AND service_name = '${service}' AND neighb_counts.count > 0;`

  return sequelize.query(sql)
}

const getCapsByDistrict = (complaint) => {
  let sql
  
  if (complaint) {
    console.log("COMPLAINT: ", complaint)
    sql = `SELECT count(*), general_cap_classification, dist_occurrence FROM complaints WHERE general_cap_classification = '${complaint}' GROUP BY general_cap_classification, dist_occurrence;`
  } else {
    console.log("NO COMPLAINT")
    sql = `SELECT count(*), dist_occurrence FROM complaints GROUP BY dist_occurrence;`
  }
  
  return sequelize.query(sql)
}

const getTimeSeriesData = (complaint) => {
  const datasql = `SELECT to_char(date_received, 'Mon') as mon, extract(year from date_received) as year, count(*), general_cap_classification FROM complaints GROUP BY mon, year, general_cap_classification;`
  const labelsql = `SELECT DISTINCT to_char(date_received, 'Mon') as mon, extract(year from date_received) as year FROM complaints`
  
  return new Promise((resolve, reject) => {
    Promise.all([sequelize.query(datasql), sequelize.query(labelsql)]).then(resolve)
    .catch(reject)
  })

}

const getOutstandingRequests = (service, limit) => {
  limit = 1000
  
  const sql = (service) ? `SELECT * FROM philly_311 WHERE "service_name" = '${service}' ORDER BY requested_datetime DESC LIMIT '${limit}'` : `SELECT * FROM philly_311 ORDER BY requested_datetime DESC LIMIT '${limit}'`
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

    return _acc
  }, {})
    
  modelDef.createdAt = {
        type: Sequelize.DATE,
        field: 'created_at'
    }

  modelDef.updatedAt = {
        type: Sequelize.DATE,
        field: 'updated_at'
    }

  const Model = sequelize.define(resourceHandle, modelDef, {freezeTableName: true})
  
  return Model 
}

module.exports = {
  getComponentData: getComponentData,
  getCapsByDistrict: getCapsByDistrict, 
  getOutstandingRequests: getOutstandingRequests,
  getServiceNumbersByNeighborhood: getServiceNumbersByNeighborhood,
  getTimeSeriesData: getTimeSeriesData
}
