# STAIRS Astro Imaging Run Scheduler

STAIRS is a specialized planning tool designed for astrophotography enthusiasts with smart telescopes (like the [Seestar S50](https://www.seestar.com/products/seestar-s50) to assist with the planning of imaging sessions. It takes into account telescope specifications, target suitability, sky conditions, and user preferences to score objects.

## Overview

A lot of apps will tell you _what_ is in the sky, but not how to build an efficient imaging plan. STAIRS does both as well as optimizing for specific equipment.

## Core Features

- Optimal Window Calculation: Determines the best start/end times for targets based on altitude thresholds and environment.
- Multi-Target Sequencing: Creates chronological plan to image multiple targets in one session.
- Session Logging: log sessions and document what you have captured

## Tech Stack

- Backend/API: Python with [astroplan](https://github.com/astropy/astroplan), [Astropy](https://www.astropy.org/), [DuckDB](https://duckdb.org/), [Swagger](https://swagger.io/), and others (see the [pyproject.toml](services/api/pyproject.toml) file for more dependencies)
- Weather Information: provided by [Open-Meteo](https://open-meteo.com)
- CLI: Python with [Typer](https://typer.tiangolo.com/) and others (see the [pyproject.toml](services/cli/pyproject.toml) file for more info)
- Web: TBD
- Docker: designed first and foremost to be run via [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Installation

1. Clone the repository:  
    git clone https://github.com/thomasehardt/STAIRS.git
1. navigate to the directory  
    cd STAIRS
1. Create your own configuration file  
    cp .config.yaml.EXAMPLE config.yaml
1. Edit config.yaml and update the information accordingly (the example config is well-documented)

### Running the application

1. Start the API layer  
    docker compose up -d
2. Run the cli (note: this will spin up a container and exit it once done) 
    docker compose run --rm -it cli

## Usage

Once started, the API layer will initialize a cache to store ephemeris and weather data. If you go to http://localhost:8000, you will be presented with the Swagger API page. This can be used to test and verify the application is working.

Alternatively, you can check the status (among many other things) with the cli:  
    docker compose run --rm -it cli status

For help with the cli application, there's a very useful help function:  
    docker compose run --rm -it cli --help

It is recommended that you create an alias for running the cli ... on Mac/Linux:  
    alias stairs-cli="docker compose run --rm -it cli"

