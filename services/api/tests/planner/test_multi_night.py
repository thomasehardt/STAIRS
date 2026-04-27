from astropy.time import Time
from src.planner.multi_night import MultiNightPlanner
from src.planner.planner_models import ObservationLocation


def test_multi_night_forecast():
    # Greenwich for simple UTC/Local matching
    loc = ObservationLocation(
        name="London", latitude=51.48, longitude=0.0, bortle_scale=None, elevation_m=0.0
    )
    planner = MultiNightPlanner(location=loc)

    # Use noon so nearest noon is today
    start_time = Time("2026-03-20T12:00:00Z")
    forecast = planner.generate_forecast(days=3, start_time=start_time)

    assert len(forecast) == 3
    # In London, March 20 noon, the next night starts around 19:00 UTC on March 20
    assert forecast[0].date == "2026-03-20"
    assert forecast[0].total_dark_hours > 0
    assert forecast[0].quality_score >= 0


def test_calculate_night_score():
    loc = ObservationLocation(
        name="London", latitude=51.48, longitude=0.0, bortle_scale=4, elevation_m=0.0
    )
    planner = MultiNightPlanner(location=loc)

    night_start = Time("2026-03-20T20:00:00Z")
    night_end = Time("2026-03-21T04:00:00Z")

    # 1. Without weather
    score = planner.calculate_night_score(night_start, night_end)
    assert score["total_dark_hours"] == 8.0
    assert score["quality_score"] > 0

    # 2. With perfect weather
    weather = [
        {
            "timestamp": "2026-03-20T22:00:00Z",
            "cloud_cover_pct": 0,
            "humidity_pct": 40,
            "seeing": 1.5,
        }
    ]
    score_weather = planner.calculate_night_score(
        night_start, night_end, weather_range=weather
    )
    assert score_weather["quality_score"] > 0

    # 3. Zero duration
    score_zero = planner.calculate_night_score(night_start, night_start)
    assert score_zero["total_dark_hours"] == 0.0
