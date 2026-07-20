import xarray as xr

url = "__URL__"
ds = xr.open_zarr(url)

# Clip a window (East Africa) — subsets every variable in the store
window = ds.sel(x=slice(28, 52), y=slice(18, -12))

# ...or sample a single point
point = ds.sel(x=36.8, y=-1.3, method="nearest")
