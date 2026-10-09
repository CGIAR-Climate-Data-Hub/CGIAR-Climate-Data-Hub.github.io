import geopandas as gpd

url = "__URL__"
gdf = gpd.read_parquet(url)

# Keep features in a window (East Africa)
window = gdf.cx[28:52, -12:18]
