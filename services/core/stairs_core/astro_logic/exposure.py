import numpy as np

# Surface Brightness (mag/arcsec^2) for Bortle scales 1-9
# These are standard astronomical approximations
BORTLE_TO_MAG_AS2 = {
    1: 22.0,
    2: 21.6,
    3: 21.0,
    4: 20.4,
    5: 19.8,
    6: 19.2,
    7: 18.6,
    8: 18.0,
    9: 17.4,
}


def calculate_sky_flux(
    bortle_scale: int,
    aperture_mm: float,
    focal_length_mm: float,
    pixel_pitch_um: float,
    quantum_efficiency: float,
) -> float:
    """
    Calculates the sky flux in electrons per pixel per second.

    :param bortle_scale: 1-9 scale of light pollution
    :param aperture_mm: telescope aperture in mm
    :param focal_length_mm: telescope focal length in mm
    :param pixel_pitch_um: sensor pixel pitch in microns
    :param quantum_efficiency: sensor QE (0.0 to 1.0)
    :return: electrons/pixel/second
    """
    # 1. Get sky surface brightness
    b_sky = BORTLE_TO_MAG_AS2.get(min(9, max(1, bortle_scale)), 18.0)

    # 2. Calculate Pixel Scale (arcsec/pixel)
    # scale = 206.265 * pixel_size / focal_length
    pixel_scale = 206.265 * pixel_pitch_um / focal_length_mm

    # 3. Calculate Aperture Area (cm^2)
    aperture_cm2 = np.pi * (aperture_mm / 20.0) ** 2

    # 4. Photometric Zero Point (Mzp)
    # Standard m=0 star flux: ~ 1.0e7 photons/s/cm^2 (integrated over visual band)
    m_zp_flux = 1.0e7

    # 5. Flux from sky per square arcsec (photons/s/cm^2/as^2)
    sky_flux_as2 = m_zp_flux * 10 ** (0.4 * -b_sky)

    # 6. Flux per pixel (electrons/s/pixel)
    sky_electrons_per_sec = (
        sky_flux_as2 * (pixel_scale**2) * aperture_cm2 * quantum_efficiency
    )

    return sky_electrons_per_sec


def calculate_optimal_sub_exposure(sky_flux_eps: float, read_noise_e: float) -> float:
    """
    Calculates the sky-limited sub-exposure time to swamp read noise by 10x.
    """
    if sky_flux_eps <= 0:
        return 300.0
    return (10.0 * (read_noise_e**2)) / sky_flux_eps


def calculate_practical_sub_exposure(
    sky_limited_s: float, focal_length_mm: float, is_alt_az: bool = True
) -> float:
    """
    Applies practical constraints to the sky-limited exposure.
    For Alt-Az mounts (like Seestar), we clamp between 10s and 20s.
    """
    # 1. Hardware Floor: Stacking thousands of 1s-5s subs is impractical
    # 2. Tracking Ceiling: Alt-Az mounts trail after ~20-30s
    if is_alt_az:
        return float(np.clip(sky_limited_s, 10.0, 20.0))

    # EQ Mounts can go much longer
    return float(np.clip(sky_limited_s, 30.0, 300.0))


def calculate_total_integration_time(
    target_mag: float,
    target_size_arcmin: list[float],
    bortle_scale: int,
    aperture_mm: float,
    focal_length_mm: float,
    pixel_pitch_um: float,
    quantum_efficiency: float,
    read_noise_e: float,
    target_snr: float = 10.0,
) -> float:
    """
    Estimates total integration time required to reach a specific SNR.

    :param target_mag: Total visual magnitude of the object
    :param target_size_arcmin: [width, height] in arcminutes
    :param target_snr: Desired Signal-to-Noise Ratio (default 10 is 'good')
    :return: total time in seconds
    """
    # 1. Target Flux (electrons/sec)
    aperture_cm2 = np.pi * (aperture_mm / 20.0) ** 2
    m_zp_flux = 1.0e7
    total_target_eps = (
        m_zp_flux * 10 ** (0.4 * -target_mag) * aperture_cm2 * quantum_efficiency
    )

    # 2. Sky Flux per pixel
    sky_eps = calculate_sky_flux(
        bortle_scale, aperture_mm, focal_length_mm, pixel_pitch_um, quantum_efficiency
    )

    # 3. Calculate target area in pixels
    pixel_scale = 206.265 * pixel_pitch_um / focal_length_mm
    # convert arcmin to arcsec
    w_as = target_size_arcmin[0] * 60.0
    h_as = (
        target_size_arcmin[1] if len(target_size_arcmin) > 1 else target_size_arcmin[0]
    ) * 60.0
    area_as2 = w_as * h_as

    # Minimum area to avoid infinity (e.g. for a star, assume 3x3 arcsec PSF)
    area_as2 = max(area_as2, 9.0)

    area_px = area_as2 / (pixel_scale**2)
    area_px = max(area_px, 1.0)

    # 4. Signal per pixel
    target_eps_px = total_target_eps / area_px

    # 5. Optimal sub time
    t_sub = calculate_optimal_sub_exposure(sky_eps, read_noise_e)

    # 6. Solve for T (Total Time) in the per-pixel SNR equation:
    # SNR = (F_px * T) / sqrt(F_px * T + S_eps * T + (T/t_sub) * R^2)
    # T = SNR^2 * (F_px + S_eps + R^2/t_sub) / F_px^2

    numerator_term = target_eps_px + sky_eps + (read_noise_e**2 / t_sub)
    total_time_s = (target_snr**2 * numerator_term) / (target_eps_px**2)

    return total_time_s
