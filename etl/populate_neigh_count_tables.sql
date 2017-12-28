-- DELETE FROM neigh_counts

DO
$do$

DECLARE
	s varchar(50);
	n varchar(50);
BEGIN

FOR s IN SELECT service_name FROM philly_311 WHERE service_name NOT IN( 'Information Request') GROUP BY service_name ORDER BY count(*) DESC LIMIT 20
	LOOP
		FOR n IN SELECT name FROM neighborhoods
			LOOP
				-- works:
				-- INSERT INTO neighb_counts (count, neighborhood, service_name) VALUES (10, n, s);
					WITH c AS (
						SELECT count(id), n, s AS "count" FROM philly_311 WHERE service_name = s AND (ST_Contains(ST_SetSRID((SELECT the_geometry FROM neighborhoods WHERE name=n),4326), ST_SetSRID(ST_MakePoint(philly_311.lon, philly_311.lat), 4326))=true)
					)
					INSERT INTO neighb_counts (count, neighborhood, service_name) SELECT * FROM c;			
			END LOOP;
	END LOOP;
END
$do$;
