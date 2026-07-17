library(terra)

r <- rast(
  "/vsicurl/__URL__"
)

# Clip a window (East Africa)
window <- crop(r, ext(28, 52, -12, 18))

# ...or sample a single point
point <- extract(r, cbind(36.8, -1.3))
