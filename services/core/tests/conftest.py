# Engine tests must not depend on network access: never fail on a stale
# bundled IERS table (sub-second UT1 error is irrelevant to these assertions).
from astropy.utils.iers import conf

conf.auto_download = False
conf.auto_max_age = None
