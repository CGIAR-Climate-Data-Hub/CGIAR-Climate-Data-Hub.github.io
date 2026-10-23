# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pandas", "pyarrow", "openpyxl", "fsspec", "aiohttp", "rangehttpserver", "rioxarray", "xarray", "zarr>=3", "h5netcdf", "h5py", "geopandas", "matplotlib"]
# ///
"""How many bytes a client pulls over HTTP from classic vs cloud-optimized layouts.

    uv run cloud_optimized_benchmark.py [raster|cube|table|vector ...] [--figure]

Data is generated, so the numbers are reproducible. Each mode writes the same
data in several layouts, serves them locally, and counts the bytes each read
pulls. Readers are the usual ones: rioxarray, xarray + zarr, pandas, geopandas.
--figure also draws one classic vs cloud-optimized pair per mode as an SVG for
the wiki.
"""

import functools
import http.server
import multiprocessing as mp
import shutil
import sys
import tempfile
from pathlib import Path

import fsspec
import geopandas as gpd
import numpy as np
import pandas as pd
import pyogrio
import rioxarray
import xarray as xr
from RangeHTTPServer import RangeRequestHandler
from shapely import Polygon
from zarr.codecs import BloscCodec

WORK = Path(tempfile.mkdtemp(prefix="cdh-bench-"))
SENT = [mp.Value("q", 0), mp.Value("q", 0)]  # bytes, requests; shared with the server process
LINK = (20e6, 0.1)  # "moderate internet": 20 Mbit/s, 100 ms round trip. Time = bytes / bandwidth + requests * rtt
rng = np.random.default_rng(0)
ROWS = []  # (layout, read, file bytes, bytes pulled), for --figure
FIGURE = [  # panel title, classic layout, cloud-optimized layout (matched as substrings of the layout name)
    ("Raster: striped GeoTIFF → COG", "striped, deflate", "COG, deflate"),
    ("Cube: NetCDF float32, map chunks → Zarr int16, balanced chunks", "NetCDF4", "packed"),
    ("Table: CSV → Parquet, zstd, sorted", "CSV", "sorted"),
    ("Vector: Shapefile → GeoParquet, bbox-sorted", "Shapefile", "bbox-sorted"),
]
SVG = Path(__file__).parents[2] / "src/content/wikis/cloud-optimizing-data/transfer.svg"
# Site tokens --terra-500, --cdh-blue-700, --text, --text-soft: an <img> SVG can't read CSS vars
COLORS = ("#cb6a3e", "#1955a6", "#1d1d1d", "#555554")


class Handler(RangeRequestHandler):
    def log_message(self, *_):
        pass

    def send_head(self):
        SENT[1].value += 1
        return super().send_head()

    def copyfile(self, source, out):  # count what actually leaves
        class Count:
            def write(_, b):
                SENT[0].value += len(b)
                return out.write(b)

        try:
            super().copyfile(source, Count())
        except (BrokenPipeError, ConnectionResetError):
            pass


SERVER = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(WORK)))
BASE = f"http://127.0.0.1:{SERVER.server_port}"
# GDAL (rioxarray, pyogrio): no directory listing, no cache between reads
pyogrio.set_gdal_config_options({"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "CPL_VSIL_CURL_NON_CACHED": f"/vsicurl/{BASE}"})
# pandas/geopandas download a plain URL whole; an fsspec handle gives them range requests, as s3fs does.
# No read-ahead cache, so bytes pulled are bytes needed.
FS = fsspec.filesystem("http", cache_type="none")


def mb(n):
    return f"{n / 1e6:.1f} MB" if n >= 1e5 else f"{n / 1e3:.0f} KB"


def secs(nbytes, requests):
    t = nbytes * 8 / LINK[0] + requests * LINK[1]
    return f"{t / 60:.1f} min" if t >= 60 else f"{t:.1f} s"


def size(path):  # a dir, or a file plus sidecars (.shp + .dbf + ...)
    files = path.rglob("*") if path.is_dir() else path.parent.glob(path.stem + ".*")
    return sum(p.stat().st_size for p in files if p.is_file())


def bench(label, layouts, reads):
    """layouts: name -> (filename, write(path)); reads: name -> read(url). One row per pair."""
    print(f"\n| {label} | size | read | bytes pulled | requests | time at 20 Mbit/s |\n| --- | --- | --- | --- | --- | --- |")
    for name, (fname, write) in layouts.items():
        write(WORK / fname)
        for rname, read in reads.items():
            SENT[0].value = SENT[1].value = 0
            read(f"{BASE}/{fname}")
            b, r = SENT[0].value, SENT[1].value
            ROWS.append((name, rname, size(WORK / fname), b))
            print(f"| {name} | {mb(size(WORK / fname))} | {rname} | {mb(b)} | {r} | {secs(b, r)} |")


def figure(path):
    """Paired bars per read: bytes pulled as a share of the classic file, i.e. of downloading it whole."""
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch
    from matplotlib.ticker import PercentFormatter

    plt.rcParams.update({"svg.fonttype": "none", "font.size": 9, "text.color": COLORS[2], "xtick.color": COLORS[3], "ytick.color": COLORS[2]})
    panels = [(t, [[r for r in ROWS if k in r[0]] for k in keys]) for t, *keys in FIGURE]
    panels = [p for p in panels if all(p[1])]  # only modes that ran
    for _, layouts in panels:  # lead with the file itself: the storage saving
        for rows in layouts:
            rows.insert(0, (rows[0][0], "the whole file", rows[0][2], rows[0][2]))
    fig, axes = plt.subplots(len(panels), 1, figsize=(7.5, 1.5 * len(panels)), sharex=True, squeeze=False)
    for ax, (title, (classic, optimized)) in zip(axes[:, 0], panels):
        full = classic[0][2]
        for i, pair in enumerate(zip(classic, optimized)):
            for j, row in enumerate(pair):
                ax.barh(i * 2.5 + j, max(row[3] / full, 0.004), height=0.8, color=COLORS[j])
                ax.text(row[3] / full + 0.015, i * 2.5 + j, mb(row[3]), va="center", fontsize=8, color=COLORS[3])
        ax.set_yticks([i * 2.5 + 0.5 for i in range(len(classic))], [r[1] for r in classic])
        ax.set_title(title, loc="left", fontsize=9, fontweight="bold")
        ax.invert_yaxis()
        ax.tick_params(length=0)
        ax.spines[["top", "right", "left"]].set_visible(False)
        ax.spines["bottom"].set_color("#e7e6e3")
    axes[-1, 0].set_xlim(0, max(r[3] / ls[0][0][2] for _, ls in panels for l in ls for r in l) + 0.15)
    axes[-1, 0].xaxis.set_major_formatter(PercentFormatter(1, decimals=0))
    axes[-1, 0].set_xlabel("data transferred, as a share of downloading the classic file whole", color=COLORS[3])
    fig.legend(handles=[Patch(color=c) for c in COLORS[:2]], labels=["classic layout", "cloud-optimized"], loc="upper right", ncol=2, frameon=False)
    fig.tight_layout(rect=(0, 0, 1, 0.97))
    fig.savefig(path, transparent=True)
    print(f"\nwrote {path}")


def field(ny, nx):
    """Smooth field with noise and a nodata 'ocean'; rounded, because measured data has limited precision."""
    y, x = np.meshgrid(np.linspace(0, 6, ny), np.linspace(0, 9, nx), indexing="ij")
    f = np.sin(y) * np.cos(x) + 0.1 * rng.standard_normal((ny, nx))
    f[np.sin(3 * y + x) > 0.8] = np.nan
    return f.round(2).astype("float32")


def raster():
    ny, nx = 1000, 2000
    da = xr.DataArray(field(ny, nx), dims=("y", "x"), coords={"y": np.linspace(90, -90, ny), "x": np.linspace(-180, 180, nx)})
    da = da.rio.write_crs("EPSG:4326").rio.write_nodata(np.nan)
    cog = dict(driver="COG", blocksize=256)
    layouts = {
        "striped, uncompressed": ("r0.tif", lambda p: da.rio.to_raster(p, tiled=False)),
        "striped, deflate": ("r1.tif", lambda p: da.rio.to_raster(p, tiled=False, compress="DEFLATE")),
        "COG, deflate": ("r2.tif", lambda p: da.rio.to_raster(p, compress="DEFLATE", **cog)),
        "COG, zstd": ("r3.tif", lambda p: da.rio.to_raster(p, compress="ZSTD", **cog)),
    }

    def window(url):
        with rioxarray.open_rasterio(url) as r:
            r.isel(x=slice(nx // 2, nx // 2 + 256), y=slice(ny // 2, ny // 2 + 256)).load()

    def overview(url):  # a COG has overviews; a striped file is read whole and coarsened
        try:
            with rioxarray.open_rasterio(url, overview_level=2) as r:
                r.load()
        except Exception:  # no overviews in the file
            with rioxarray.open_rasterio(url) as r:
                r.coarsen(x=8, y=8, boundary="trim").mean().load()

    bench("layout", layouts, {"a 256 x 256 window": window, "a 1/8 overview": overview})


def cube():
    nt, ny, nx = 240, 90, 180
    season = np.sin(np.arange(nt) / 12 * 2 * np.pi)[:, None, None]
    data = (field(ny, nx)[None] + season + 0.05 * rng.standard_normal((nt, ny, nx))).round(2).astype("float32")
    ds = xr.Dataset({"v": (("t", "y", "x"), data)}, coords={"t": np.arange(nt), "y": np.linspace(90, -90, ny), "x": np.linspace(-180, 180, nx)})
    chunkings = {"map chunks": (1, ny, nx), "series chunks": (nt, 16, 16), "balanced": (60, 32, 32)}
    nc = {"v": {"zlib": True, "chunksizes": (1, ny, nx)}}
    layouts = {f"NetCDF4, zlib, (1, {ny}, {nx}) chunks": ("cube.nc", lambda p: ds.to_netcdf(p, engine="h5netcdf", encoding=nc))}
    layouts |= {
        f"Zarr {c} {name}": (f"{name}.zarr", functools.partial(ds.to_zarr, zarr_format=3, consolidated=False, encoding={"v": {"chunks": c}}))
        for name, c in chunkings.items()
    }
    # Data has 2 decimals, so int16 with scale_factor=0.01 is lossless; bitshuffle lines up the bits before zstd
    packed = {"dtype": "int16", "scale_factor": 0.01, "_FillValue": -32768, "chunks": (60, 32, 32), "compressors": [BloscCodec(cname="zstd", clevel=5, shuffle="bitshuffle")]}
    layouts["Zarr (60, 32, 32) balanced, int16 packed, blosc zstd bitshuffle"] = ("packed.zarr", functools.partial(ds.to_zarr, zarr_format=3, consolidated=False, encoding={"v": packed}))

    def v(url):  # lazy: only touched chunks are fetched
        if url.endswith(".nc"):
            return xr.open_dataset(FS.open(url), engine="h5netcdf").v
        return xr.open_zarr(url, chunks=None, consolidated=False).v

    reads = {
        "one full map": lambda url: v(url).isel(t=-1).load(),
        "one point, full series": lambda url: v(url).isel(y=ny // 2, x=nx // 2).load(),
    }
    bench("format, chunks (t, y, x)", layouts, reads)


def table():
    """A household survey, like RHoMIS: wide, mostly short coded answers, modules a household answers or skips whole."""
    n = 100_000
    sparse = lambda v, p: np.where(rng.random(n) < p, None, v)
    cols = {
        "hh_id": np.arange(n),
        "country": rng.choice([f"C{i:02d}" for i in range(40)], n),
        "village": rng.choice([f"Village {j}" for j in range(3000)], n),
        "crop": rng.choice(["maize", "beans", "cassava", "sorghum", "millet", "rice"], n),
        "year": rng.choice(range(2015, 2023), n),
        "hh_size": rng.poisson(5, n),
        "area_ha": sparse(rng.gamma(2, 0.5, n).round(1), 0.2),
        "yield_t": sparse(rng.gamma(3, 0.6, n).round(1), 0.3),
        "income": sparse(np.where(rng.random(n) < 0.3, 0, (rng.lognormal(6, 1, n) / 100).round() * 100), 0.2),
    }
    for m in range(6):  # yes/no and count questions, skewed as real answers are
        skip = rng.random(n) < rng.uniform(0.3, 0.8)
        for i in range(5):
            cols[f"m{m}_yes_{i}"] = np.where(skip, None, rng.choice(["yes", "no"], n, p=[0.15, 0.85]))
            cols[f"m{m}_n_{i}"] = np.where(skip, None, rng.poisson(0.3, n))
    df = pd.DataFrame(cols)
    pq = dict(row_group_size=50_000)  # pandas' default of 1M rows would give one group and nothing to skip
    layouts = {
        "CSV": ("t.csv", lambda p: df.to_csv(p, index=False)),
        "Excel": ("t.xlsx", lambda p: df.to_excel(p, index=False)),
        "Parquet, snappy": ("t0.parquet", lambda p: df.to_parquet(p, **pq)),
        "Parquet, zstd": ("t1.parquet", lambda p: df.to_parquet(p, compression="zstd", **pq)),
        "Parquet, zstd, sorted by country, year": ("t2.parquet", lambda p: df.sort_values(["country", "year"]).to_parquet(p, compression="zstd", **pq)),
    }
    def read(url, **kw):
        if url.endswith(".csv"):
            return pd.read_csv(url, usecols=kw.get("columns"))
        if url.endswith(".xlsx"):
            return pd.read_excel(url)
        with FS.open(url) as f:
            return pd.read_parquet(f, **kw)

    reads = {
        "one country, one year": lambda url: read(url, filters=[("country", "==", "C07"), ("year", "==", 2020)]),
        "one column, all rows": lambda url: read(url, columns=["income"]),
    }
    bench("format", layouts, reads)


def vector():
    n, verts = 2000, 300
    theta = np.linspace(0, 2 * np.pi, verts, endpoint=False)
    ids = rng.permutation(n)  # shuffled: file order is not spatial order
    geoms = []
    for i in ids:
        cx, cy = (i % 50) * 7 - 175 + rng.normal(), (i // 50) * 4 - 80 + rng.normal()
        r = 2.5 * (1 + 0.3 * np.convolve(rng.standard_normal(verts), np.ones(15) / 15, "same"))
        geoms.append(Polygon(zip(cx + r * np.cos(theta), cy + r * np.sin(theta))))
    gdf = gpd.GeoDataFrame(
        {"name": [f"unit-{i}" for i in ids], "region": [f"R{i % 8}" for i in ids], "value": rng.gamma(2, 10, n)},
        geometry=geoms, crs="EPSG:4326",
    )
    pq = dict(compression="zstd", row_group_size=50, write_covering_bbox=True)
    layouts = {
        "Shapefile": ("v0.shp", gdf.to_file),
        "GeoPackage": ("v1.gpkg", gdf.to_file),
        "GeoParquet, zstd": ("v2.parquet", lambda p: gdf.to_parquet(p, **pq)),
        "GeoParquet, zstd, bbox-sorted": ("v3.parquet", lambda p: gdf.iloc[gdf.hilbert_distance().argsort()].to_parquet(p, **pq)),
    }
    bbox = (20, -10, 40, 10)

    def read_bbox(url):
        if not url.endswith(".parquet"):
            return gpd.read_file(f"/vsicurl/{url}", bbox=bbox)  # plain http would be downloaded whole
        with FS.open(url) as f:
            return gpd.read_parquet(f, bbox=bbox)

    def read_column(url):  # one attribute, no geometry
        if not url.endswith(".parquet"):
            return gpd.read_file(f"/vsicurl/{url}", columns=["name"], ignore_geometry=True)
        with FS.open(url) as f:
            return pd.read_parquet(f, columns=["name"])

    bench("format", layouts, {"one bounding box": read_bbox, "one attribute, no geometry": read_column})


if __name__ == "__main__":
    modes = {"raster": raster, "cube": cube, "table": table, "vector": vector}
    # Own process, not a thread: pyogrio holds the GIL while GDAL waits on the network. Fork keeps the bound socket.
    server = mp.get_context("fork").Process(target=SERVER.serve_forever, daemon=True)
    server.start()
    try:
        for m in [a for a in sys.argv[1:] if a in modes] or modes:
            modes[m]()
        if "--figure" in sys.argv:
            figure(SVG)
    finally:
        server.terminate()
        shutil.rmtree(WORK, ignore_errors=True)
