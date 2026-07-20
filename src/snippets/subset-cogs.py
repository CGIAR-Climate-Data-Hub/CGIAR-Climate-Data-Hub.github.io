import rioxarray

da = rioxarray.open_rasterio("__URL__", masked=True)

# Clip a window (East Africa)
window = da.rio.clip_box(minx=28, miny=-12, maxx=52, maxy=18)

# ...or sample a single point
point = da.sel(x=36.8, y=-1.3, method="nearest")
