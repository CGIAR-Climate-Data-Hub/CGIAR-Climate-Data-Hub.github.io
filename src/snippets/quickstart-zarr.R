library(stars)

ds <- read_mdim(
  'ZARR:"/vsicurl/__URL__"',
  proxy = TRUE
)
