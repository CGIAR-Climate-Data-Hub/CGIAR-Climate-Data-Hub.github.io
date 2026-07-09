import xarray as xr

ds = xr.open_zarr(
    "__ZARR_URL__"
)

# One array per __DIM__ — clip a window (East Africa)
window = ds["__MEMBER__"].sel(x=slice(28, 52), y=slice(18, -12))

# ...or sample a single point
point = ds["__MEMBER__"].sel(x=36.8, y=-1.3, method="nearest")
