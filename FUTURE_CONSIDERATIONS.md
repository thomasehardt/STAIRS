# Future Considerations for STAIRS

## Tests

Yes, I have tests for this code. I have not yet checked them in because I haven't gone through them for correctness or completeness, and I would like to ensure that everything has solid tests around it, both unit and integration tests.

## API: Better Units Conversion

Right now, I am calling Open-Meteo APIs as-is, and likely will continue to do so, defaulting to centimeters, etc. I would like to add a conversion capability into the API layer for those who want Fahrenheit, etc.

## Supporting Documentation

I am working on supporting documentation for STAIRS - think of educational resources:

- how a smart telescope works
- how image stacking works
- SNR and exposure times vs Bortle scale

## Web UI

Obviously, a nice web UI is going to be needed. Since I'm more of a back-end engineer, I might need some assistance from something like Google Gemini, but I'll give it a shot.

Just know that initial versions might be ugly. Some features that would be specific to the web UI:

- **catalog browsing**: images of catalog objects
- **simulated viewport**: take a target and show an example of how it would appear in the smart telescope
- **overhead view**: show the night sky and how object move across it
- **graphs**: sky quality and target altitude over time

Note that the overall plan is to have this entire app ecosystem run via Docker (and Docker Compose), and the web app will be tied into that as well.

## TUI

There is a simple CLI interface for the app that exercises some of the APIs - it was more written for fast testing/POC and iteration on my part, but I think there is some merit to it. I went with [Typer](https://typer.tiangolo.com/) as it has a very low learning curve and I'm re-learning Python as I work on this project.

There are limitations to Typer that I'm not fond of - specifically, I would like to have a full-blown TUI application that sits in front of the API as an alternative to the web UI (some of us really like the terminal!). I am going to look into using [Textual](https://textual.textualize.io/) for this purpose. My goal with the TUI is to mimic as much functionality from the web UI as possible.

## OpenNGC Catalog

_aka One Catalog to Rule them All_

The [OpenNGC](https://github.com/mattiaverga/openngc) catalog is a license-friendly catalog encompassing many of the existing catalogs along with nice features as data normalization and deduplication. It would make an excellent drop-in replacement for the multiple catalog JSON files that currently exist.
