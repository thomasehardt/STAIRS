---
title: The Physics of Light Collection
description: How photons are captured and converted into data.
---

To best understand how STAIRS calculates the ideal timing for your image runs, we must look at the journey of light from distant objects to your smart telescope. This process is a conversion of energy: from photons to electrons to data.

## The Photon Funnel

Let us consider "light" coming from a distant object, so we start with the basic "unit" of light - the photon. Photons are massless particles that are the smallest possible packet of light and all other forms of electromagnetic radiation. Essentially, a photon is a "piece of light" that travels at the speed of light ($3\ \times\ 10^8\ m/s$). Let's pick M51/NGC5194 - the Whirlpool Galaxy. This galaxy is 31 million light years away from Earth, so the light we see today (the photons we receive at our telescope) spent 31 million years getting to us, roughly when apes started appearing on Earth.

A photon travels through (mostly empty) space to get to us, but there is a thin haze of ionized gas in a lot of that space, so the photons that get to us have avoided being scattered or absorbed. Oh, and while it's traveling to us, the universe itself is expanding, slightly shifting the photon to the red end of the color spectrum (redshift). Finally, it reaches the edge of the Milky Way, where it has many more obstacles to deal with, including the Interstellar Medium which is thick with gas and "cosmic dust" - mostly microscopic grains of carbon and silicates - which can cause extinction (absorbing the photon) or reddening (scattering light in blue wavelengths more than red ones).

It eventually makes it to Earth's atmosphere, where it experiences the most turbulent part of its journey. There are several factors in the atmosphere that affect its journey:

scintillation
: Temperature and density fluctuations in the atmosphere act like tiny, moving lenses. This causes "seeing", where the photon's path is refracted slightly, causing a twinkling.

absorption/scattering
: Nitrogen ($78\%$ of our atmosphere) and Oxygen ($21\%$) molecules scatter shorter wavelengths (like blue), whereas water vapor and aerosols can absorb specific frequencies.

light pollution
: In urban and suburban environments, the photon must compete with the multitude of "local" photons reflected from man-made light. The moon also plays a small part in this, which is why the moon's illumination and proximity to a target are factors in scoring.

Finally, the photon hits the telescope's objective lens. Because of the effects of **dispersion** (where different wavelengths of light refract at slightly different angles), different colored photons would naturally arrive at different focal points. Most smart telescopes have specific lenses (apochromats) that correct for this, ensuring photons of all colors arrive at the sensor at the same time and in the same spot.

From here, the photon travels towards the sensor and strikes a silicon pixel.

## Converting Light to Data

The telescope's sensor is made up of millions of individual pixels (or "photosites") that convert the photon to energy. When the photon hits the silicon surface of a pixel, it knocks an electron loose.

> ### Advanced: The Photoelectric Effect
>
> The process of turning light into electricity is governed by the photoelectric effect. If a photon has enough energy—specifically, greater than the "work function" ($\Phi$) of the silicon—it can knock an electron loose, promoting it from the valence band to the conduction band. The energy of the photon is defined by its frequency:
>
> $$E\ =\ h \times f$$
>
> where $h$ is Planck's constant, and $f$ is the frequency of the light. If $E\ \gt\ \Phi$, the leftover energy becomes kinetic energy for the electron:
>
> $$K_{max}\ = \ h \times f - \Phi$$

So, every photon with enough energy releases an electron? No! There's another factor that comes into play here: the quantum efficiency ($QE$) of the pixel. For example, only $80\%$ of photons that _could_ release an electron _do_ release an electron (if the $QE$ is $0.8$ or $80\%$).

Let's say our photon was one of the photons that did release an electron. Once we have enough energy (from the released electrons), we get a measurable voltage. One key thing that also happens is that this releases a small amount of heat and interference, which adds some "phantom" electrons to the mix, adding "noise" to the data.

We have an image now, right? Not yet! Right now we have some information - a voltage, but it is in an analog signal - a continuous value. This gets converted to something a computer can understand, so it gets assigned a value (typically from $0 - 4,095$ or $0 - 16,383$) by an Analog-to-Digital Converter (ADC). At this point, we have a single value - the voltage triggered by the photon. Most sensors are monochrome, meaning they only detect brightness, so we first pass the photon through a mosaic of red, green, and blue filters - called a Bayer Filter - which happens before the photon hits the sensor. The software inside the sensor then uses a process called "debayering" where the values determining color are compared against neighboring pixels to determine the true color of the photon that hit the pixel.

Additional resources:

- [Debayering details](https://docs.baslerweb.com/visualapplets/files/manuals/content/bayer%20Overview.html)
- [More Information About How Debayering](https://skyandtelescope.org/astronomy-resources/astrophotography-tips/redeeming-color-planetary-cameras/)

## Swamping the Noise

The "phantom" electrons that get released due to heat and interference cause noise in the image (called "read noise"). To combat this, we need to capture enough photons to overcome this noise (meaning we are confident that the signal is real). In order to do this, STAIRS considers the number of seconds needed to make the actual light from the sky ten times stronger than the read noise. It also takes into consideration the Bortle score: in a higher Bortle area, the sky glow from more light pollution fills pixels very quickly, meaning exposure time for an individual frame should be shorter. Conversely, under darker skies, we need longer exposure times to overcome the noise.

## Practical Limits

The way a telescope is mounted also sets a limit on exposure time. There are two types of mounts:

alt-az mount
: With an alt-az mount, the telescope moves up-down and left-right and remains in the same orientation. The sky does not move in an up-down left-right manner, so with this mount, longer exposures risk creating trails. Our practical limit with such a mount is $10 - 20$ seconds.

equatorial mount
: This mount aligns the telescope with the rotation of the Earth (which is the rotation of the sky). With this configuration, the telescope still moves up-down and left-right, but since it is aligned to the rotation, we can have longer exposure times ($30 - 300$ seconds).

The result is that we need more frames with an alt-az mount than with an equatorial mount, but the trade-off is that equatorial mounts require additional setup (alignment with the North Star) and typically require additional equipment. Most smart telescopes use an alt-az mount.
