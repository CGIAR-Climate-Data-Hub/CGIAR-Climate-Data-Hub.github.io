import duckdb
import rioxarray

url = "__URL__"

# As STAC: one row per item, with its assets and properties
items = duckdb.sql(f"SELECT id, datetime, assets FROM read_parquet('{url}')").df()

# As one mosaic through GDAL's tile index driver (GDAL 3.10+). If items have
# several assets, pick one: open_rasterio(..., LOCATION_FIELD="assets.<key>.href")
da = rioxarray.open_rasterio(f"GTI:/vsicurl/{url}", masked=True)
