library(sf)

url <- "/vsicurl/__URL__"

# Read only features in a window (East Africa)
box <- st_as_sfc(st_bbox(c(xmin = 28, ymin = -12, xmax = 52, ymax = 18), crs = st_crs(4326)))
window <- st_read(url, wkt_filter = st_as_text(box))
