import icechunk as ic
import xarray as xr

repo = ic.Repository.open(
    ic.http_storage("__URL__"),
    # Virtual chunks are read from the source files, which must be authorized.
    # An s3:// source takes ic.credentials.s3_credentials(anonymous=True)
    authorize_virtual_chunk_access={"__SOURCE__": ic.credentials.HttpAccess},
)
ds = xr.open_zarr(repo.readonly_session("main").store, chunks={})
