library(duckdb)

url <- "__URL__"

# Fetches only the columns and row groups the query needs
con <- dbConnect(duckdb())
df <- dbGetQuery(con, sprintf("
  SELECT *            -- or name the columns you need
  FROM read_parquet('%s')
  -- WHERE <column> = '<value>'
  LIMIT 100
", url))
