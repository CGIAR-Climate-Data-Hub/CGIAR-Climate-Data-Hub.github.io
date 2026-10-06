library(terra)

# The VRT opens as one raster; its tiles are read on demand
r <- rast("/vsicurl/__URL__")
