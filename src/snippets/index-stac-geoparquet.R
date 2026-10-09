library(duckdb)
library(terra)

url <- "__URL__"

# As STAC: one row per item, with its assets and properties
con <- dbConnect(duckdb())
items <- dbGetQuery(con, sprintf("SELECT id, datetime, assets FROM read_parquet('%s')", url))

# As one mosaic through GDAL's tile index driver (GDAL 3.10+). If items have
# several assets, pick one: rast(..., opts = "LOCATION_FIELD=assets.<key>.href")
r <- rast(paste0("GTI:/vsicurl/", url))
