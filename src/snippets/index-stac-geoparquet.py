import rioxarray
import rustac

url = "__URL__"

# As STAC items: search reads only the rows that match (area, time, ids…)
items = rustac.search_sync(url, bbox=[28, -12, 52, 18])
# ...or every item, as a FeatureCollection: rustac.read_sync(url)

# As one mosaic through GDAL's tile index driver (GDAL 3.10+). If items have
# several assets, pick one: open_rasterio(..., LOCATION_FIELD="assets.<key>.href")
da = rioxarray.open_rasterio(f"GTI:/vsicurl/{url}", masked=True)
