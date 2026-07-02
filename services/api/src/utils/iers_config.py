"""
IERS configuration — sets auto_max_age=None to prevent 30-day age
errors that would otherwise crash the API after a month of uptime.
"""

from astropy.utils import iers

# Critical: prevents API crashes when IERS data is older than 30 days
iers.conf.auto_max_age = None
iers.conf.auto_download = False
