import xarray as xr

# JSON or Parquet references, through kerchunk's xarray engine. Chunks on
# public S3: add storage_options={"remote_options": {"anon": True}}
ds = xr.open_dataset("__URL__", engine="kerchunk", chunks={})
