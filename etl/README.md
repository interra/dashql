# Import 311 DATA to 
Here's our tooling for pulling in JSON to local postgres for further processing.

**NOTE** These tools work but the ETL process is not yet automated. We haven't applied these instructions from scratch. Some restrictions apply.

* create tables in postgres using `schemas.sql`
* install postgres-import-json `npm install -g postgres-import-json`
* run appropriate CURL command (below)
* import to postgres `postgres-import-json -h localhost -u postgres -p 5432 -d postgres -t _311_data -f`
* Import neighborhood json to `neighborhoods` using `/geom_imports.js`
* Parse json to postgres rows using `insert_311_from_json_table.sql`
* Build `neighb_counts` table with `populate_neigh_count_tables.sql` 

## Postgres DB
@@TODO - instructions to build DB
For now, just checkout the bu and hack it together

## ETL scripts
### geom_imports.js
Imports data from geojson file into `neighborhoods` table in postgres. This is used foe calculating requests by type by neighborhood.

### insert_311_from_json_table.sql
Builds record rows from bullk json - 1 row per 311 request.
Handles type casting - doesn't do any geometry.

### populate_neigh_count_tables.sql
Perform geometry queries against neihgborhoods table and request position to to build table of aggregate values of request type by neighborhood.

## API Interactions curl >> file.json
### ALL 2017 public requests
curl -sb -H "Accept: application/json" https://phl.carto.com/api/v2/sql?q=select%20*%20from%20public_cases_fc%20WHERE%20requested_datetime%20%3E=%20%272017-01-01%27::date%20and%20requested_datetime%20%3C=%20%2701-01-2018%27::date%20ORDER%20BY%20requested_datetime%20ASC >> 2017_philly_311.json

### NUMBER OF 2017 REQS
curl -sb -H "Accept: application/json" https://phl.carto.com/api/v2/sql?q=select%20COUNT(*)%20from%20public_cases_fc%20WHERE%20requested_datetime%20%3E=%20%272017-01-01%27::date%20and%20requested_datetime%20%3C=%20%2701-01-2018%27::date%20ORDER%20BY%20requested_datetime%20ASC >> 2017_philly_311.json
