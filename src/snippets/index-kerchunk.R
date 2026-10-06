library(stars)

# JSON references, through GDAL's Zarr driver (GDAL 3.11+)
x <- read_mdim("/vsikerchunk_json_ref/{/vsicurl/__URL__}")
