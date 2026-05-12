from datetime import UTC, datetime, timedelta

import httpx
import pytz
import typer
from cli.config import API_URL
from rich.console import Console
from rich.panel import Panel
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
            f"[bold green]\u2713[/bold green] API is online at {API_URL} "
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
            console.print("[yellow]No weather forecast data returned.[/yellow]")
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
        )

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(code=1)


@app.command()
def search(
    query: str = typer.Argument(..., help="Search query (ID or name)"),
    limit: int = typer.Option(10, "--limit", "-n", help="Max results"),
):
    """
    Search for astronomical objects by name or identifier.
    """
    try:
        with console.status(f"[bold green]Searching for '{query}'..."):
            response = httpx.get(
                f"{API_URL}/targets/search", params={"q": query, "limit": limit}
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])

        if not results:
            console.print(f"[yellow]No targets found matching '{query}'.[/yellow]")
            return

        table = Table(title=f"Search Results: {query}")
        table.add_column("ID", style="cyan")
        table.add_column("Common Name", style="white")
        table.add_column("Type", style="dim")
        table.add_column("Constellation", style="dim")
        table.add_column("Mag", justify="right")

        for r in results:
            table.add_row(
                r["identifier"],
                r["common_name"] or "-",
                r["target_type"],
                r["constellation"],
                f"{r['magnitude']:.1f}" if r["magnitude"] is not None else "-",
            )

        console.print(table)
        console.print(f"[dim]Found {data['total_found']} results.[/dim]")

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(1)


def draw_seasonal_bar(season: str | None) -> str:
    if not season:
        return "[dim]J F M A M J J A S O N D[/dim]"

    months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
    season_months = {
        "winter": [11, 0, 1],
        "spring": [2, 3, 4],
        "summer": [5, 6, 7],
        "autumn": [8, 9, 10],
    }
    active = season_months.get(season.lower(), [])

    parts = []
    for i, m in enumerate(months):
        if i in active:
            parts.append(f"[bold green]{m}[/bold green]")
        else:
            parts.append(f"[dim]{m}[/dim]")
    return " ".join(parts)


def draw_ascii_fov(fov_x, fov_y, t_x, t_y):
    """
    Renders a simple ASCII representation of the framing.
    Adjusted for terminal character aspect ratio (usually 2:1).
    """
    width = 40
    height = 12
    char_aspect = 2.0

    # Calculate a 'zoom' level that fits BOTH the sensor and the target comfortably.
    max_dim = max(fov_x, fov_y, t_x, t_y) * 1.2

    # Final dimensions in chars (using floats for center calculation)
    sw = (fov_x / max_dim) * width
    sh = ((fov_y / max_dim) * (height * char_aspect)) / char_aspect

    tw = (t_x / max_dim) * width
    th = ((t_y / max_dim) * (height * char_aspect)) / char_aspect

    canvas = [[" " for _ in range(width)] for _ in range(height)]
    cx, cy = (width - 1) / 2.0, (height - 1) / 2.0

    # 1. Draw Target FIRST
    t_rx = max(tw / 2.0, 0.5)
    t_ry = max(th / 2.0, 0.5)

    for y in range(height):
        for x in range(width):
            dx = (x - cx) / t_rx
            dy = (y - cy) / t_ry
            dist = dx**2 + dy**2

            if tw < 1.5 and th < 1.5:
                if x == int(round(cx)) and y == int(round(cy)):
                    canvas[y][x] = "\u25cb"
                continue

            if 0.7 < dist < 1.3:
                canvas[y][x] = "\u25cb"
            elif dist <= 0.7:
                canvas[y][x] = "\u00b7"

    # 2. Draw Sensor Frame LAST (Overlays target)
    s_x1, s_x2 = int(cx - sw / 2), int(cx + sw / 2)
    s_y1, s_y2 = int(cy - sh / 2), int(cy + sh / 2)

    for y in range(max(0, s_y1), min(height, s_y2 + 1)):
        for x in range(max(0, s_x1), min(width, s_x2 + 1)):
            if x == s_x1 or x == s_x2 or y == s_y1 or y == s_y2:
                # shaded block overlay over target character
                if canvas[y][x] != " ":
                    canvas[y][x] = "[white]\u2592[/white]"
                else:
                    canvas[y][x] = "[white]\u2588[/white]"

    # 3. Apply final colors
    for y in range(height):
        for x in range(width):
            if canvas[y][x] == "\u25cb":
                canvas[y][x] = "[bold yellow]\u25cb[/bold yellow]"
            elif canvas[y][x] == "\u00b7":
                canvas[y][x] = "[yellow]\u00b7[/yellow]"

    lines = ["".join(row) for row in canvas]
    return "\n".join(lines)


def draw_visibility_bar(positions: list) -> str:
    """
    Renders a 1-line color-coded visibility bar based on altitude.
    """
    if not positions:
        return "[dim]No visibility data[/dim]"

    width = 50
    step = max(1, len(positions) // width)
    sampled = positions[::step][:width]

    parts = []
    for p in sampled:
        alt = p["alt_deg"]
        if alt < 20:
            parts.append("[dim]\u00b7[/dim]")
        elif alt < 30:
            parts.append("[red]\u2588[/red]")
        elif alt < 45:
            parts.append("[yellow]\u2588[/yellow]")
        else:
            parts.append("[green]\u2588[/green]")

    return "".join(parts)


@app.command()
def target(
    target_id: str = typer.Argument(..., help="Target identifier (e.g. M31, NGC7000)"),
    telescope: str | None = typer.Option(
        None, "--telescope", "-t", help="Telescope profile name"
    ),
):
    """
    Get detailed information and framing preview for a specific target.
    """
    try:
        # 1. Fetch Defaults for Profile
        with console.status("[bold green]Loading settings..."):
            settings_resp = httpx.get(f"{API_URL}/settings/")
            settings_resp.raise_for_status()
            settings = settings_resp.json()
            tel_name = telescope or settings.get("planning", {}).get(
                "default_telescope"
            )

        # 2. Fetch Detail
        with console.status(f"[bold green]Fetching details for {target_id}..."):
            params = {"profile_name": tel_name} if tel_name else {}
            response = httpx.get(f"{API_URL}/targets/{target_id}", params=params)

            if response.status_code == 404:
                # Try searching instead
                search_resp = httpx.get(
                    f"{API_URL}/targets/search", params={"q": target_id, "limit": 1}
                )
                search_data = search_resp.json().get("results", [])
                if search_data:
                    target_id = search_data[0]["identifier"]
                    response = httpx.get(
                        f"{API_URL}/targets/{target_id}", params=params
                    )
                else:
                    console.print(
                        f"[bold red]Error:[/bold red] Target '{target_id}' not found."
                    )
                    raise typer.Exit(1)

            response.raise_for_status()
            t = response.json()

        # 3. Render Detail View
        title = f"[bold white]{t['common_name'] or t['identifier']}[/bold white]"
        if t["common_name"]:
            title += f" [dim]({t['identifier']})[/dim]"

        console.print(f"\n {title}")
        console.print(f" [dim]{t['target_type']} in {t['constellation']}[/dim]\n")

        from rich.columns import Columns
        from rich.panel import Panel

        # Stats Table
        stats_table = Table.grid(padding=(0, 4))
        stats_table.add_column(style="bold cyan")
        stats_table.add_column()

        stats_table.add_row("RA:", f"{t['ra_deg']:.4f}\u00b0")
        stats_table.add_row("Dec:", f"{t['dec_deg']:.4f}\u00b0")
        stats_table.add_row(
            "Mag:", f"{t['magnitude']:.1f}" if t["magnitude"] is not None else "N/A"
        )

        size_str = "N/A"
        if t["angular_size"]:
            s = [x * 60 for x in t["angular_size"]]  # to arcmins
            size_str = f"{s[0]:.2g}'"
            if len(s) > 1:
                size_str += f" \u00d7 {s[1]:.2g}'"
        stats_table.add_row("Size:", size_str)

        season_panel = Panel(
            draw_seasonal_bar(t.get("season")),
            title="[bold]Seasonal Visibility[/bold]",
            border_style="dim",
            padding=(1, 2),
        )

        # Scoring Panel
        rel_score = t.get("oss_score") or 0.0
        abs_score = t.get("aqs_score") or 0.0
        rel_color = "green" if rel_score > 70 else "yellow" if rel_score > 40 else "red"
        abs_color = "green" if abs_score > 50 else "yellow" if abs_score > 20 else "red"

        score_table = Table.grid(padding=(0, 2))
        score_table.add_row(
            "[bold]REL:[/bold]",
            f"[bold {rel_color}]{rel_score:.0f}%[/bold {rel_color}]",
        )
        score_table.add_row(
            "[bold]ABS:[/bold]",
            f"[bold {abs_color}]{abs_score:.0f}%[/bold {abs_color}]",
        )

        score_panel = Panel(
            score_table,
            title="[bold]Quality Scores[/bold]",
            border_style="dim",
            padding=(1, 2),
        )

        console.print(
            Columns(
                [
                    Panel(stats_table, title="[bold]Stats[/bold]", border_style="dim"),
                    score_panel,
                    season_panel,
                ]
            )
        )

        # ETC & FOV if profile exists
        if t.get("exposure"):
            etc = t["exposure"]
            etc_panel = Panel(
                f"[bold green]Practical Sub:[/bold green]"
                f" {etc['practical_sub_s']:.0f}s\n"
                f"[dim]Sky-Limited Min: {etc['sky_limited_sub_s']:.0f}s[/dim]\n"
                f"[bold green]Target Integration:[/bold green]"
                f" {etc['total_integration_h']:.1f}h [dim](SNR 20)[/dim]",
                title="[bold]Exposure Recommendations[/bold]",
                border_style="green",
                padding=(1, 2),
            )

            # ASCII FOV
            prof_resp = httpx.get(f"{API_URL}/profiles/")
            profile = next(
                (p for p in prof_resp.json()["profiles"] if p["name"] == tel_name), None
            )

            if profile:

                def calc_fov(sensor_px, pixel_pitch, focal_length):
                    sensor_size_mm = (sensor_px * pixel_pitch) / 1000
                    return (
                        2 * (180 / 3.14159) * (sensor_size_mm / (2 * focal_length)) * 60
                    )

                fov_x = calc_fov(
                    profile["sensor_x"],
                    profile["pixel_pitch_um"],
                    profile["focal_length_mm"],
                )
                fov_y = calc_fov(
                    profile["sensor_y"],
                    profile["pixel_pitch_um"],
                    profile["focal_length_mm"],
                )

                t_x = t["angular_size"][0] * 60 if t["angular_size"] else 1.0
                t_y = (
                    t["angular_size"][1] * 60
                    if t["angular_size"] and len(t["angular_size"]) > 1
                    else t_x
                )

                fov_preview = draw_ascii_fov(fov_x, fov_y, t_x, t_y)
                preview_panel = Panel(
                    fov_preview,
                    title=f"[bold]Framing Preview: {tel_name}[/bold]",
                    subtitle="[dim]\u2588=Sensor, \u25cb=Target[/dim]",
                    border_style="cyan",
                    padding=(1, 4),
                )

                console.print(Columns([etc_panel, preview_panel]))
            else:
                console.print(etc_panel)

        # Transit Peak & Chart
        with console.status("[bold green]Calculating orbit..."):
            loc_resp = httpx.get(f"{API_URL}/locations/")
            loc_data = next(
                (loc for loc in loc_resp.json()["locations"] if loc["is_default"]),
                loc_resp.json()["locations"][0],
            )

            pos_resp = httpx.get(
                f"{API_URL}/targets/{t['identifier']}/position",
                params={
                    "latitude": loc_data["latitude"],
                    "longitude": loc_data["longitude"],
                    "start_time": datetime.now(UTC).isoformat(),
                    "hours": 12,
                },
            )
            pos_data = pos_resp.json().get("positions", [])
            if pos_data:
                peak = max(pos_data, key=lambda x: x["alt_deg"])
                tz_name = loc_data.get("timezone", "UTC")
                peak_time = format_local_time(peak["time"], tz_name)

                vis_bar = draw_visibility_bar(pos_data)

                console.print(
                    Panel(
                        f"Tonight's Peak:"
                        f" [bold cyan]{peak['alt_deg']}\u00b0[/bold cyan]"
                        f" at [bold cyan]{peak_time}[/bold cyan]"
                        f" [dim]({tz_name})[/dim]\n"
                        f"Altitude:  {vis_bar} [dim]0h-12h[/dim]",
                        title="[bold]Visibility Window[/bold]",
                        border_style="dim",
                        padding=(1, 2),
                    )
                )

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(1)


@app.command()
def etc(
    magnitude: float = typer.Argument(..., help="Apparent magnitude of the target"),
    bortle: int | None = typer.Option(
        None,
        "--bortle",
        "-b",
        help="Bortle scale (1-9). Defaults to your default location.",
    ),
    telescope: str | None = typer.Option(
        None,
        "--telescope",
        "-t",
        help="Telescope profile name. Defaults to your default telescope.",
    ),
    size: float = typer.Option(
        10.0, "--size", help="Target size in arcminutes (approximate major axis)"
    ),
):
    """
    Standalone Exposure Time Calculator.
    Calculate recommended sub-exposures and integration time for any object.
    """
    try:
        # 1. Load defaults
        with console.status("[bold green]Loading hardware specs..."):
            settings_resp = httpx.get(f"{API_URL}/settings/")
            settings_resp.raise_for_status()
            settings = settings_resp.json()

            tel_name = telescope or settings.get("planning", {}).get(
                "default_telescope"
            )
            b_scale = bortle
            if b_scale is None:
                default_loc = next(
                    (loc for loc in settings["locations"] if loc["default"]),
                    settings["locations"][0],
                )
                b_scale = default_loc.get("bortle_scale", 5)

        # 2. Get Profile Detail
        with console.status(f"[bold green]Fetching specs for {tel_name}..."):
            prof_resp = httpx.get(f"{API_URL}/profiles/")
            profile = next(
                (p for p in prof_resp.json()["profiles"] if p["name"] == tel_name), None
            )

            if not profile:
                console.print(
                    f"[bold red]Error:[/bold red]"
                    f" Telescope profile '{tel_name}' not found."
                )
                raise typer.Exit(1)

        # 3. Call API for calculation
        with console.status(f"[bold green]Calculating for {tel_name}..."):
            payload = {
                "magnitude": magnitude,
                "bortle": b_scale,
                "telescope_profile_name": tel_name,
                "angular_size": [size],
            }
            # We'll use a new utility endpoint for this
            calc_resp = httpx.post(f"{API_URL}/system/calculate-exposure", json=payload)
            calc_resp.raise_for_status()
            res = calc_resp.json()

        # 4. Render
        table = Table(
            title=f"ETC Results: Mag {magnitude} @ Bortle {b_scale}", box=None
        )
        table.add_column("Parameter", style="bold cyan")
        table.add_column("Value")

        table.add_row("Telescope:", tel_name)
        table.add_row("Aperture:", f"{res['aperture_mm']}mm")
        table.add_row("Sky Flux:", f"{res['sky_flux']:.2f} e-/px/s")
        table.add_section()
        table.add_row(
            "[green]Practical Sub:[/green]",
            f"[bold green]{res['practical_sub_s']:.0f}s[/bold green]",
        )
        table.add_row(
            "[dim]Sky-Limited Min:[/dim]", f"[dim]{res['sky_limited_sub_s']:.0f}s[/dim]"
        )
        table.add_row(
            "[green]Integration (SNR 20):[/green]",
            f"[bold green]{res['total_integration_h']:.1f} hours[/bold green]",
        )

        console.print(
            Panel(
                table,
                border_style="green",
                title="[bold]Exposure Time Calculator[/bold]",
            )
        )
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(1)


@app.command()
def recommend(
    location: str | None = typer.Option(
        None, "--location", "-l", help="Location name (overrides default)"
    ),
    telescope: str | None = typer.Option(
        None, "--telescope", "-t", help="Telescope profile (overrides default)"
    ),
    min_alt: float = typer.Option(30.0, "--min-alt", help="Minimum altitude threshold"),
    date: str | None = typer.Option(
        None, "--date", help="Target date (YYYY-MM-DD). Defaults to tonight."
    ),
):
    """
    Fetch top recommended targets for a given night and telescope.
    """
    try:
        # 1. Fetch Defaults
        with console.status("[bold green]Loading settings..."):
            settings_resp = httpx.get(f"{API_URL}/settings/")
            settings_resp.raise_for_status()
            settings = settings_resp.json()

        # Resolve Location
        loc_data = None
        if location:
            loc_data = next(
                (
                    loc
                    for loc in settings["locations"]
                    if loc["name"].lower() == location.lower()
                ),
                None,
            )
            if not loc_data:
                console.print(
                    f"[bold red]Error:[/bold red] Location '{location}' not found."
                )
                raise typer.Exit(1)
        else:
            loc_data = next(
                (loc for loc in settings["locations"] if loc["default"]), None
            )
            if not loc_data and settings["locations"]:
                loc_data = settings["locations"][0]

        if not loc_data:
            console.print("[bold red]Error:[/bold red] No locations configured.")
            raise typer.Exit(1)

        # Resolve Telescope
        tel_name = telescope or settings.get("planning", {}).get("default_telescope")
        if not tel_name:
            # Try to fetch profiles to find one
            prof_resp = httpx.get(f"{API_URL}/profiles/")
            profiles = prof_resp.json().get("profiles", [])
            if profiles:
                tel_name = profiles[0]["name"]
            else:
                console.print(
                    "[bold red]Error:[/bold red] No telescope profiles found."
                )
                raise typer.Exit(1)

        # 2. Build Request
        start_time = None
        if date:
            start_time = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=UTC)
        else:
            start_time = datetime.now(UTC)

        payload = {
            "latitude": loc_data["latitude"],
            "longitude": loc_data["longitude"],
            "elevation_m": loc_data["elevation_m"],
            "bortle_scale": loc_data["bortle_scale"],
            "telescope_profile_name": tel_name,
            "min_alt": min_alt,
            "start_time": start_time.isoformat(),
        }

        # 3. Fetch Recommendations
        with console.status(
            f"[bold green]Calculating recommendations for {tel_name}..."
        ):
            rec_resp = httpx.post(
                f"{API_URL}/plan/recommend", json=payload, timeout=30.0
            )
            rec_resp.raise_for_status()
            recommendations = rec_resp.json()

        if not recommendations:
            console.print(
                "[yellow]No suitable targets found"
                " for your hardware/location tonight.[/yellow]"
            )
            return

        # 4. Render Table
        table = Table(title=f"Tonight's Best: {tel_name} @ {loc_data['name']}")
        table.add_column("Target", style="cyan", no_wrap=True)
        table.add_column("Type / Const", style="dim")
        table.add_column("REL", justify="center")
        table.add_column("ABS", justify="center")
        table.add_column("Visibility", justify="center")
        table.add_column("ETC (Sub/Total)", justify="right")

        for r in recommendations:
            # Score coloring
            rel_score = r["oss_score"]
            abs_score = r["aqs_score"] or 0.0

            rel_color = (
                "green" if rel_score > 70 else "yellow" if rel_score > 40 else "red"
            )
            abs_color = (
                "green" if abs_score > 50 else "yellow" if abs_score > 20 else "red"
            )

            rel_str = f"[bold {rel_color}]{rel_score:.0f}%[/bold {rel_color}]"
            abs_str = f"[bold {abs_color}]{abs_score:.0f}%[/bold {abs_color}]"

            # Window
            tz_name = loc_data.get("timezone", "UTC")
            win_start = format_local_time(r["visible_start"], tz_name)
            win_end = format_local_time(r["visible_end"], tz_name)
            window_str = f"{win_start} - {win_end}" if r["visible_start"] else "N/A"

            # ETC
            etc_str = "N/A"
            if r["exposure"]:
                sub = r["exposure"]["practical_sub_s"]
                tot = r["exposure"]["total_integration_h"]
                etc_str = f"{sub:.0f}s / {tot:.1f}h"

            # Target naming priority
            name_str = f"[bold white]{r['common_name'] or r['target_id']}[/bold white]"
            if r["common_name"]:
                name_str += f" [dim]({r['target_id']})[/dim]"

            table.add_row(
                name_str,
                f"{r['target_type']} / {r['constellation']}",
                rel_str,
                abs_str,
                window_str,
                etc_str,
            )

        console.print(table)
        console.print(
            f"[dim]Showing top {len(recommendations)} targets"
            f" optimized for {tel_name}.[/dim]"
        )

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
