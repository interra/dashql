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

// note -t we are currently doing resource 
// insertion via a node module
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

// this works!
 const mock = 'SELECT "service_name", count("service_name") AS "count" FROM philly_311 WHERE (ST_Contains(ST_SetSRID((SELECT the_geometry FROM neighborhoods WHERE name=\'MANTUA\'),4326), ST_SetSRID(philly_311.the_geom, 4326))=true OR ST_Contains(ST_SetSRID((SELECT the_geometry FROM neighborhoods WHERE name=\'MANTUA\'),4326), ST_SetSRID(philly_311.the_geom, 4326))=true OR ST_Contains(ST_SetSRID((SELECT the_geometry FROM neighborhoods WHERE name=\'CEDAR_PARK\'),4326), ST_SetSRID(philly_311.the_geom, 4326))=true) GROUP BY "service_name";' 

  const raw = sequelize.dialect.QueryGenerator.selectQuery(component.resourceHandle, options)
  console.log("RAW", raw)
  return sequelize.query(mock)
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
