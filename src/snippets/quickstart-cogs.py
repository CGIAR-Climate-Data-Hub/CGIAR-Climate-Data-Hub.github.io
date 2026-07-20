import rioxarray

url = "__URL__"
da = rioxarray.open_rasterio(url, masked=True)
