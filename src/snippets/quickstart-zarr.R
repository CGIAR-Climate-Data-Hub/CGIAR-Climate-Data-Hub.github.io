library(stars)

url <- 'ZARR:"/vsicurl/__URL__"'
ds <- read_mdim(url, proxy = TRUE)
