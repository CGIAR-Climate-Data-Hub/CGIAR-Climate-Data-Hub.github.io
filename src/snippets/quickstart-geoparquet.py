import geopandas as gpd

# Reading a URL needs fsspec and aiohttp installed
url = "__URL__"
gdf = gpd.read_parquet(url)
