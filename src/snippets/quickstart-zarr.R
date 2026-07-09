library(stars)

ds <- read_mdim(
  'ZARR:"/vsicurl/__ZARR_URL__"',
  proxy = TRUE
)
