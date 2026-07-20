library(terra)

url <- "/vsicurl/__URL__"
r <- rast(url)

# Clip a window (East Africa)
window <- crop(r, ext(28, 52, -12, 18))

# ...or sample a single point
point <- extract(r, cbind(36.8, -1.3))
