# As STAC items (pip install rustac): search reads only the rows that match
rustac search "__URL__" --bbox=28,-12,52,18 items.json
# ...or every item: rustac translate "__URL__" items.json

# As one mosaic through GDAL's tile index driver (GDAL 3.10+). If items have
# several assets, add: -oo LOCATION_FIELD=assets.<key>.href
gdalinfo "GTI:/vsicurl/__URL__"
