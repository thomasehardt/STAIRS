from datetime import UTC, datetime, timedelta, timezone

import httpx
import pytz
import typer
from cli.config import API_URL
from rich.console import Console
from rich.table import Table

app = typer.Typer(
    help="STAIRS CLI",
    add_completion=False,
)
console = Console()


@app.command()
def status():
    """
    Check the status of the API layer
    """
    try:
        with console.status("[bold green]Checking API status..."):
            response = httpx.get(f"{API_URL}/", follow_redirects=True)
            response.raise_for_status()

        console.print(
            f"[bold green]✓[/bold green] API is online at {API_URL} "
            f"(Status: {response.status_code})"
        )
    except Exception as e:
        console.print(
            f"[bold red]\u2717[/bold red] Could not connect to API on {API_URL}"
        )
        console.print(f"[red]Error: {str(e)}[/red]")
        raise typer.Exit(code=1)


@app.command()
def version():
    """
    Show the version of the CLI
    """
    console.print("STAIRS CLI [bold cyan]v0.1.0[/bold cyan]")


@app.command()
def locations():
    """
    List all configured locations
    """
    try:
        with console.status("[bold green]Fetching locations..."):
            response = httpx.get(f"{API_URL}/locations/")
            response.raise_for_status()
            data = response.json()
            locations_list = data.get("locations", [])

        if not locations_list:
            console.print("[yellow]No locations configured.[/yellow]")

        locations_list.sort(key=lambda x: x["name"])
    except Exception as e:
        console.print(f"[bold red]Error getting locations:[/bold red] {str(e)}")
        raise typer.Exit(code=1)

    table = Table(title="Locations")
    table.add_column("Name", style="cyan")
    table.add_column("Default", justify="center")
    table.add_column("Latitude", justify="right")
    table.add_column("Longitude", justify="right")
    table.add_column("Elevation [m]", justify="right")
    table.add_column("Timezone", justify="left")
    table.add_column("Bortle", justify="center")

    for loc in locations_list:
        is_default = "[bold green]\u2713[/bold green]" if loc.get("is_default") else ""
        table.add_row(
            loc["name"],
            is_default,
            f"{loc['latitude']:.2f}",
            f"{loc['longitude']:.2f}",
            f"{loc['elevation_m']:.0f}",
            loc.get("timezone") or "UTC",
            str(loc.get("bortle_scale") or "-"),
        )

    console.print(table)


@app.command()
def telescopes():
    """
    List all configured telescope profiles.
    """
    try:
        with console.status("[bold green]Fetching telescope profiles..."):
            response = httpx.get(f"{API_URL}/profiles/")
            response.raise_for_status()
            data = response.json()
            profiles = data.get("profiles", [])

        if not profiles:
            console.print("[yellow]No telescope profiles found.[/yellow]")
            return
        profiles.sort(key=lambda x: x["name"])
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(code=1)

    table = Table(title="Telescope Profiles")
    table.add_column("Name", style="cyan")
    table.add_column("Aperture [mm]", justify="right")
    table.add_column("Focal Length [mm]", justify="right")
    table.add_column("Sensor res", justify="center")
    table.add_column("Pixel Pitch [\u00b5m]", justify="right")

    for profile in profiles:
        sensor_res = f"{profile['sensor_x']}x{profile['sensor_y']}"
        table.add_row(
            profile["name"],
            str(profile["aperture_mm"]),
            str(profile["focal_length_mm"]),
            sensor_res,
            f"{profile['pixel_pitch_um']:.2f}",
        )

    console.print(table)


@app.command()
def catalogs():
    """
    List all available astronomical catalogs.
    """
    try:
        with console.status("[bold green]Fetching catalogs..."):
            response = httpx.get(f"{API_URL}/catalogs/")
            response.raise_for_status()
            data = response.json()
            catalog_list = data.get("catalogs", [])

        if not catalog_list:
            console.print("[yellow]No catalogs found.[/yellow]")
            return

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(code=1)

    table = Table(title="Astronomical Catalogs")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="bold")
    table.add_column("Items", justify="right")
    table.add_column("Description")

    for catalog in catalog_list:
        table.add_row(
            catalog["id"],
            catalog["name"],
            f"{catalog['item_count']:,d}",
            catalog["description"],
        )

    console.print(table)


@app.command()
def weather(
    days: int = typer.Option(
        1,
        "--days",
        "-d",
        help="Number of days to forecast.",
        min=1,
        max=14,
    ),
    location: str | None = typer.Option(
        None,
        "--location",
        "-l",
        help="Name of the location to use (overrides default)",
    ),
):
    """
    Get weather forecast for a location (defaults to the default location in config)
    """
    try:
        with console.status("[bold green]Fetching settings..."):
            settings_resp = httpx.get(f"{API_URL}/settings/")
            settings_resp.raise_for_status()
            settings = settings_resp.json()

        locations = settings.get("locations", [])

        target_loc = None
        if location:
            target_loc = next(
                (
                    loc
                    for loc in locations
                    if loc.get("name").lower() == location.lower()
                ),
                None,
            )
            if not target_loc:
                console.print(
                    f"[bold red]Error:[/bold red] Location '{location}' "
                    "not found in settings."
                )
                raise typer.Exit(code=1)
        else:
            target_loc = next((loc for loc in locations if loc.get("default")), None)
            if not target_loc:
                if locations:
                    target_loc = locations[0]
                else:
                    console.print(
                        "[bold red]Error:[/bold red] No locations configured "
                        "in settings."
                    )
                    raise type.Exit(code=1)

        latitude = target_loc["latitude"]
        longitude = target_loc["longitude"]
        name = target_loc["name"]

        with console.status("[bold green]Resolving timezone..."):
            loc_resp = httpx.get(f"{API_URL}/locations/")
            loc_resp.raise_for_status()
            loc_detail = next(
                (loc for loc in loc_resp.json()["locations"] if loc["name"] == name), {}
            )
            tz_name = loc_detail.get("timezone", "UTC")

        console.print(
            f"Fetching [bold cyan]{days}-day[/bold cyan] weather forecast for "
            f"[bold cyan]{name}[/bold cyan] ({latitude}, {longitude}), "
            "[dim]Local Time[/dim]..."
            f"[bold cyan]{name}[/bold cyan] ({latitude}, {longitude}), "
            "[dim]Local Time[/dim]..."
        )

        start = datetime.now(UTC)
        end = start + timedelta(days=days)

        with console.status("[bold green]Fetching weather forecast..."):
            weather_resp = httpx.get(
                f"{API_URL}/weather/range",
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                },
                timeout=30.0,
            )
            weather_resp.raise_for_status()
            weather_forecasts = weather_resp.json()

        if not weather_forecasts:
            console.prin("[yellow]No weather forecast data returned.[/yellow]")
            return

        table = Table(title=f"{days}-day Weather Forecast: {name}")
        table.add_column("Date", style="dim")
        table.add_column(f"Time ({tz_name})", style="magenta")
        table.add_column("Temp [\u00b0C]", justify="right")
        table.add_column("Clouds [%]", justify="right")
        table.add_column("Precip [mm/h]", justify="right")
        table.add_column("Wind [m/s]", justify="right")
        table.add_column("Humidity [%]", justify="right")

        last_date = None
        for f in weather_forecasts:
            dt_utc = datetime.fromisoformat(f["timestamp"].replace("Z", "+00:00"))
            local_dt = dt_utc.astimezone(pytz.timezone(tz_name))

            date_str = local_dt.strftime("%Y-%m-%d")
            ts = local_dt.strftime("%H:%M")

            if last_date and date_str != last_date:
                table.add_section()

            display_date = date_str if date_str != last_date else ""
            last_date = date_str

            clouds = f["cloud_cover_pct"]
            cloud_str = f"{clouds:.0f}%"
            if clouds < 10:
                cloud_str = f"[bold green]{cloud_str}[/bold green]"
            elif clouds > 50:
                cloud_str = f"[bold red]{cloud_str}[/bold red]"

            table.add_row(
                display_date,
                ts,
                f"{f['temperature_c']:.1f}",
                cloud_str,
                f"{f['precipitation_mm_per_hour']:.1f}",
                f"{f['wind_speed_mps']:.1f}",
                f"{f.get('humidity_pct', 0):.0f}%",
            )

        console.print(table)

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(code=1)


def format_local_time(dt_str: str | datetime | None, tz_name: str | None) -> str:
    """
    converts timestamps to local time in HH:MM format for displaying in a table
    """
    if not dt_str:
        return "-"

    if isinstance(dt_str, str):
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    else:
        dt = dt_str

    # if dt has no timezone, it "must" be UTC right?
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)

    if tz_name:
        try:
            local_tz = pytz.timezone(tz_name)
            dt = dt.astimezone(local_tz)
        except Exception:
            # we cannot extract a timezone - continue anyway
            pass

    return dt.strftime("%H:%M")


@app.command()
def imaging_forecast(
    days: int = typer.Option(
        7,
        "--days",
        "-d",
        help="Number of nights to forecast.",
        min=1,
        max=30,
    ),
    location: list[str] = typer.Option(
        None,
        "--location",
        "-l",
        help="Name of the location(s) to use. Use 'all' for all configured locations.",
    ),
    date: str | None = typer.Option(
        None,
        "--date",
        help="Start date for the forecast (YYYY-MM-DD). Defaults to current date.",
    ),
):
    """
    Shows astronomical night periods and imaging quality for next N days
    """
    try:
        with console.status("[bold green]Fetching location settings..."):
            settings_resp = httpx.get(f"{API_URL}/settings/")
            settings_resp.raise_for_status()
            settings = settings_resp.json()
            all_locs = {loc["name"]: loc for loc in settings.get("locations", [])}

            # get timezones from /locations
            loc_resp = httpx.get(f"{API_URL}/locations/")
            loc_resp.raise_for_status()
            loc_tz_map = {
                loc["name"]: loc.get("timezone", "UTC")
                for loc in loc_resp.json()["locations"]
            }

        target_names = []
        if not location:
            default_loc = next(
                (
                    loc["name"]
                    for loc in settings.get("locations", [])
                    if loc.get("default")
                ),
                None,
            )

            target_names = (
                [default_loc]
                if default_loc
                else [next(iter(all_locs.keys()))]
                if all_locs
                else []
            )
        elif "all" in [loc_name.lower() for loc_name in location]:
            target_names = list(all_locs.keys())
        else:
            for loc_name in location:
                if any(al.lower() == loc_name.lower() for al in all_locs):
                    actual_name = next(
                        al for al in all_locs if al.lower() == loc_name.lower()
                    )
                    target_names.append(actual_name)
                else:
                    console.print(
                        f"[bold red]Warning:[/bold red] Location '{loc_name}' "
                        "not found."
                    )

        if not target_names:
            console.print("[bold red]Error:[/bold red] No valid locations selected.")
            raise typer.Exit(code=1)

        console.print("[bold green]Locations Chosen[/bold green]:")
        for tn in target_names:
            console.print(f"\t{tn}")

        for loc_name in target_names:
            tz_name = loc_tz_map.get(loc_name, "UTC")
            params = {"days": days, "location_name": loc_name}
            if date:
                params["start_date"] = date

            with console.status(f"[bold green]Fetching forecast for {loc_name}..."):
                response = httpx.get(
                    f"{API_URL}/plan/forecast", params=params, timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                forecast_days = data.get("days", [])

            if not forecast_days:
                console.print(
                    f"[yellow]No forecast data returned for {loc_name}.[/yellow]"
                )
                continue

            table = Table(title=f"Imaging Forecast: {loc_name} ({tz_name})")
            table.add_column("Date", style="dim")
            table.add_column("Night Start", style="magenta")
            table.add_column("Night End", style="magenta")
            table.add_column("Dark Hrs", justify="right")
            table.add_column("Eff. Hrs", justify="right")
            table.add_column("Relative", justify="center")
            table.add_column("Absolute", justify="center")
            table.add_column("Notes")

            # iterate through the days
            for d in forecast_days:
                start_str = format_local_time(
                    d.get("astronomical_night_start"), tz_name
                )
                end_str = format_local_time(d.get("astronomical_night_end"), tz_name)

                relative_score = d.get(
                    "relative_quality", float(d.get("quality_score", 0))
                )
                absolute_score = d.get("absolute_quality", 0.0)

                relative_str = f"{relative_score:.0f}%"
                absolute_str = f"{absolute_score:.0f}%"

                # color code
                if relative_score >= 70:
                    relative_str = f"[bold green]{relative_str}[/bold green]"
                elif relative_score < 30:
                    relative_str = f"[bold red]{relative_str}[/bold red]"

                if absolute_score >= 70:
                    absolute_str = f"[bold green]{absolute_str}[/bold green]"
                elif absolute_score < 30:
                    absolute_str = f"[bold red]{absolute_str}[/bold red]"

                notes = []
                api_note = d.get("note")
                if api_note:
                    notes.append(api_note)

                # some flavor text for scores
                # moon impact
                if not api_note and relative_score < 60 and d["total_dark_hours"] > 2:
                    notes.append("Bright Moon")

                # short night impact
                if d["total_dark_hours"] > 0 and d["total_dark_hours"] < 4:
                    notes.append("Short Night")

                notes_str = ", ".join(notes)

                table.add_row(
                    d["date"],
                    start_str,
                    end_str,
                    f"{d['total_dark_hours']:.1f}",
                    f"{d['effective_hours']:.1f}",
                    relative_str,
                    absolute_str,
                    notes_str,
                )

            console.print(table)
            console.print()

        console.print(
            "[dim]* Eff. Hrs (Effective Hours) accounts for moon phase "
            "and cloud cover.[/dim]"
            "and cloud cover.[/dim]"
        )

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(code=1)


if __name__ == "__main__":
    app()
