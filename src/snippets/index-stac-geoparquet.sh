# As STAC: one row per item, with its assets and properties
duckdb -c "SELECT id, datetime, assets FROM read_parquet('__URL__')"

# As one mosaic through GDAL's tile index driver (GDAL 3.10+). If items have
# several assets, add: -oo LOCATION_FIELD=assets.<key>.href
gdalinfo "GTI:/vsicurl/__URL__"
