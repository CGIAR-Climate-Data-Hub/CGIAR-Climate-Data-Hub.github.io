import duckdb

url = "__URL__"

# Fetches only the columns and row groups the query needs
df = duckdb.sql(f"""
    SELECT *            -- or name the columns you need
    FROM read_parquet('{url}')
    -- WHERE <column> = '<value>'
    LIMIT 100
""").df()
