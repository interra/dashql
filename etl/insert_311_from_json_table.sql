--- DROP TABLE IF EXISTS philly_311

-- CREATE TABLE FROM SCHEMA

--
-- Insert 311 records from imported JSON
--
WITH records AS (
  WITH rows AS ( 
  	SELECT json_array_elements(data::json) AS row FROM _311_data
  )
	SELECT (row->>'cartodb_id')::int, row->>'the_geom', row->>'the_geom_webmercator', (row->>'objectid')::int, (row->>'service_request_id')::int, row->>'status', row->>'status_notes', row->>'service_name', row->>'service_code', row->>'agency_responsible', row->>'service_notice', to_date(row->>'requested_datetime', 'YYYY-MM-DD'), to_date(row->>'updated_datetime', 'YYYY-MM-DD'), to_date(row->>'expected_datetime', 'YYYY-MM-DD'), row->>'address', row->>'zipcode', row->>'media_url', to_number(row->>'lat', '99.999999999'), to_number(row->>'lon','MI99.999999999'), to_date(row->>'created_at', 'YYYY-MM-DD'), to_date(row->>'updated_at', 'YYYY-MM-DD') FROM rows
)
INSERT INTO philly_311 (cartodb_id, the_geom, the_geom_webmercator, objectid, service_request_id, status, status_notes, service_name, service_code, agency_responsible, service_notice, requested_datetime, updated_datetime, expected_datetime, address, zipcode, media_url, lat, lon, created_at, updated_at) SELECT * FROM records;
--
-- End insert 311 records
--

