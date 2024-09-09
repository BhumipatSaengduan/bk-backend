---------------------------------
-- create a temporary postgres database
--   docker run --rm -p 5432:5432 -e 'POSTGRES_USER=postgres' -e 'POSTGRES_PASSWORD=postgres' postgres:16
---------------------------------
-- docker run --rm -it --add-host=host.docker.internal:host-gateway postgres:16 psql -h host.docker.internal -U postgres -c "CREATE USER animeb WITH PASSWORD 'very_secure_password';" -c "CREATE DATABASE animeb_db;" -c "GRANT ALL PRIVILEGES ON DATABASE animeb_db TO animeb;" -c "ALTER DATABASE animeb_db OWNER TO animeb;" && rm -rf ./drizzle/ && pn db:generate && pn db:migrate

CREATE USER animeb WITH PASSWORD 'very_secure_password';
CREATE DATABASE animeb_db;
GRANT ALL PRIVILEGES ON DATABASE animeb_db TO animeb;
ALTER DATABASE animeb_db OWNER TO animeb;
