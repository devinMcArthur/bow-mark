import React from "react";
import {
  Box,
  Flex,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";

/**
 * 7-day weather forecast for a lat/lng pair, backed by Google Maps
 * Platform's Weather API (`weather.googleapis.com`). Reuses the same
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as the satellite thumbnail — no
 * separate key, no separate vendor relationship.
 *
 * Renders as a horizontal strip of day cards. Silent failure if the
 * API errors (key restriction mismatch, quota, network) — the rest of
 * the hero keeps working.
 */

interface WeatherForecastProps {
  latitude: number;
  longitude: number;
  /** How many days to show (1–10). Default 7. */
  days?: number;
  /**
   * Layout mode:
   *   - "horizontal" (default): always a horizontal strip of vertical
   *     tiles. Used by the jobsite hero where the strip is a banner.
   *   - "responsive": vertical stack of full-width rows on mobile
   *     (`base`), horizontal tile strip on `md+`. Used by the daily-
   *     report weather modal so mobile users get a tall scrollable
   *     list instead of horizontal scrolling inside a narrow modal.
   */
  layout?: "horizontal" | "responsive";
}

interface DayForecast {
  date: Date;
  iconBaseUri: string; // append `.svg` to get the icon image
  conditionLabel: string;
  conditionType: string;
  highC: number;
  lowC: number;
  precipPct: number;
  precipMm: number;
  windKmh: number;
}

// Module-level cache keyed by `${lat},${lng},${days}`. Browsers do their
// own HTTP caching but Google's Weather API responses don't always carry
// long-lived Cache-Control, so we keep an in-memory layer to dedupe
// across page navigations / re-mounts within the same session.
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { data: DayForecast[]; expires: number }>();

function cacheKey(lat: number, lng: number, days: number): string {
  // Round coords to 4 decimals (~11 m) so micro-jitter doesn't bust the
  // cache when the same jobsite is viewed twice.
  return `${lat.toFixed(4)},${lng.toFixed(4)},${days}`;
}

function transform(rawDays: any[]): DayForecast[] {
  return rawDays.map((d) => {
    // Day forecast we care about for "are we paving today?" — daytimeForecast
    // covers the work hours; nighttime is mostly relevant for concrete cure
    // questions which we'll add later if useful.
    const day = d.daytimeForecast ?? {};
    const cond = day.weatherCondition ?? {};
    // Construct as a local-time calendar date. `displayDate` is the
    // calendar date Google considers authoritative for the forecast;
    // building it via Date.UTC then rendering it in Mountain Time
    // would shift it back a day.
    const date = new Date(
      d.displayDate?.year ?? 1970,
      (d.displayDate?.month ?? 1) - 1,
      d.displayDate?.day ?? 1
    );
    return {
      date,
      iconBaseUri: cond.iconBaseUri ?? "",
      conditionLabel: cond.description?.text ?? "—",
      conditionType: cond.type ?? "UNKNOWN",
      highC: d.maxTemperature?.degrees ?? 0,
      lowC: d.minTemperature?.degrees ?? 0,
      precipPct: day.precipitation?.probability?.percent ?? 0,
      precipMm: day.precipitation?.qpf?.quantity ?? 0,
      windKmh: day.wind?.speed?.value ?? 0,
    };
  });
}

const WeatherForecast: React.FC<WeatherForecastProps> = ({
  latitude,
  longitude,
  days = 7,
  layout = "horizontal",
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [forecast, setForecast] = React.useState<DayForecast[] | null>(() => {
    return cache.get(cacheKey(latitude, longitude, days))?.data ?? null;
  });
  const [errored, setErrored] = React.useState(false);

  React.useEffect(() => {
    if (!apiKey) {
      setErrored(true);
      return;
    }
    const key = cacheKey(latitude, longitude, days);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      setForecast(cached.data);
      return;
    }

    let cancelled = false;
    // Google's Weather API uses `pageSize` for "max days to return".
    // The intuitive `days` parameter is silently ignored and the API
    // falls back to its 5-day default — that's why an early version
    // of this strip only showed 5 days even when we asked for 7.
    const url =
      `https://weather.googleapis.com/v1/forecast/days:lookup` +
      `?key=${apiKey}` +
      `&location.latitude=${latitude}` +
      `&location.longitude=${longitude}` +
      `&pageSize=${days}`;

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        const transformed = transform(data.forecastDays ?? []);
        cache.set(key, {
          data: transformed,
          expires: Date.now() + CACHE_TTL_MS,
        });
        setForecast(transformed);
      })
      .catch(() => {
        if (cancelled) return;
        setErrored(true);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, latitude, longitude, days]);

  if (errored || !apiKey) return null;

  if (!forecast) {
    return (
      <Flex gap={2} overflow="hidden" px={3} py={3}>
        {Array.from({ length: days }).map((_, i) => (
          <Skeleton key={i} h="92px" w="80px" borderRadius="md" />
        ))}
      </Flex>
    );
  }

  const isResponsive = layout === "responsive";

  return (
    <Flex
      gap={2}
      px={3}
      py={3}
      direction={isResponsive ? { base: "column", md: "row" } : "row"}
      overflowX={isResponsive ? { base: "visible", md: "auto" } : "auto"}
      css={{
        scrollbarWidth: "none",
        "::-webkit-scrollbar": { display: "none" },
      }}
    >
      {forecast.map((day, i) => (
        <DayCard
          key={day.date.toISOString()}
          day={day}
          isToday={i === 0}
          layout={layout}
        />
      ))}
    </Flex>
  );
};

interface DayCardProps {
  day: DayForecast;
  isToday: boolean;
  layout: "horizontal" | "responsive";
}

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DayCard: React.FC<DayCardProps> = ({ day, isToday, layout }) => {
  // Operationally notable conditions only — Calgary is freezing for
  // half the year, so a "freezing" border on every winter card adds
  // noise rather than signal. Reserve the highlight for things that
  // would actually stop work.
  const isHeavyRain = day.precipMm >= 10 || day.precipPct >= 70;
  const isVeryCold = day.lowC <= -10;
  const isResponsive = layout === "responsive";

  const bg = isHeavyRain
    ? "blue.50"
    : isVeryCold
      ? "purple.50"
      : isToday
        ? "white"
        : "transparent";

  return (
    <Tooltip
      label={
        <Stack spacing={0} fontSize="xs">
          <Text>{day.conditionLabel}</Text>
          <Text>
            Precip: {day.precipPct}% · {day.precipMm.toFixed(1)}mm
          </Text>
          <Text>Wind: {Math.round(day.windKmh)} km/h</Text>
        </Stack>
      }
      placement="top"
      hasArrow
    >
      <Flex
        direction={isResponsive ? { base: "row", md: "column" } : "column"}
        align="center"
        gap={isResponsive ? { base: 3, md: 0 } : 0}
        flex={isResponsive ? { base: "0 0 auto", md: 1 } : 1}
        w={isResponsive ? { base: "100%", md: "auto" } : "auto"}
        minW={isResponsive ? { base: "auto", md: "72px" } : "72px"}
        py={2}
        px={isResponsive ? { base: 3, md: 1 } : 1}
        borderRadius="md"
        bg={bg}
        borderWidth="1px"
        borderColor={isToday ? "blue.300" : "transparent"}
      >
        {/* Day + date */}
        <Flex
          direction="column"
          align={isResponsive ? { base: "flex-start", md: "center" } : "center"}
          minW={isResponsive ? { base: "60px", md: "auto" } : "auto"}
        >
          <Text
            fontSize="xs"
            fontWeight={isToday ? "bold" : "semibold"}
            color={isToday ? "blue.700" : "gray.600"}
            lineHeight="short"
          >
            {isToday ? "Today" : DAY_LABEL[day.date.getDay()]}
          </Text>
          <Text fontSize="2xs" color="gray.500" lineHeight="short">
            {MONTH_LABEL[day.date.getMonth()]} {day.date.getDate()}
          </Text>
        </Flex>

        {day.iconBaseUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${day.iconBaseUri}.svg`}
            alt={day.conditionLabel}
            width={40}
            height={40}
            style={{ width: 40, height: 40, flexShrink: 0 }}
          />
        )}

        {/* Condition text — only visible in mobile-row layout, gives
            the row breathing room and contextual info. */}
        {isResponsive && (
          <Text
            display={{ base: "block", md: "none" }}
            flex={1}
            fontSize="sm"
            color="gray.700"
            isTruncated
          >
            {day.conditionLabel}
          </Text>
        )}

        {/* Temperatures */}
        <Flex gap={1} mt={isResponsive ? { base: 0, md: 1 } : 1} alignItems="baseline" flexShrink={0}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {Math.round(day.highC)}°
          </Text>
          <Text fontSize="xs" color="gray.500">
            {Math.round(day.lowC)}°
          </Text>
        </Flex>

        {/* Precipitation */}
        <Box
          mt={isResponsive ? { base: 0, md: 0.5 } : 0.5}
          fontSize="2xs"
          color="blue.600"
          minH="14px"
          minW={isResponsive ? { base: "44px", md: "auto" } : "auto"}
          textAlign={isResponsive ? { base: "right", md: "center" } : "center"}
          flexShrink={0}
        >
          {day.precipPct >= 20 ? `💧 ${day.precipPct}%` : ""}
        </Box>
      </Flex>
    </Tooltip>
  );
};

export default WeatherForecast;
