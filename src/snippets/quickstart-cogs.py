import rioxarray

da = rioxarray.open_rasterio(
    "__COG_URL__", masked=True
)
