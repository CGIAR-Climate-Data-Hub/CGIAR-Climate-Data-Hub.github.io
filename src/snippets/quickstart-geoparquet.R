library(sf)

# Needs GDAL with the Parquet driver: "Parquet" %in% st_drivers()$name
url <- "/vsicurl/__URL__"
gdf <- st_read(url)
