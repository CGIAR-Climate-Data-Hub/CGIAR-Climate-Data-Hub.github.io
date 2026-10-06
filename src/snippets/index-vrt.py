import rioxarray

# The VRT opens as one raster; its tiles are read on demand
da = rioxarray.open_rasterio("__URL__", masked=True)
