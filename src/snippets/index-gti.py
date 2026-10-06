import rioxarray

# The tile index opens as one mosaic (GDAL 3.9+)
da = rioxarray.open_rasterio("GTI:/vsicurl/__URL__", masked=True)
