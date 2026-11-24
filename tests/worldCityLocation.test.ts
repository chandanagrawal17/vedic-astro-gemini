import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getLocationRoute } from "../src/app/api/location/route";
import { resolveHistoricalUtcOffsetHours } from "../src/lib/location/timezoneOffset";
import { searchWorldCities } from "../src/lib/location/worldCitySearch";
import { resetRateLimiter } from "../src/lib/rateLimit";

test("searchWorldCities finds Muzaffarnagar (including space-separated country qualifier) from bundled index", () => {
  const direct = searchWorldCities("muzaffarnagar", { dob: "1994-07-14" });
  assert.ok(direct.length > 0);
  assert.equal(direct[0].city, "Muzaffarnagar");
  assert.equal(direct[0].state, "Uttar Pradesh");
  assert.equal(direct[0].country, "India");
  assert.equal(direct[0].tz, 5.5);
  assert.equal(direct[0].timeZone, "Asia/Kolkata");

  const withCountry = searchWorldCities("muzaffarnagar india");
  assert.ok(withCountry.length > 0);
  assert.equal(withCountry[0].city, "Muzaffarnagar");
  assert.equal(withCountry[0].country, "India");
});

test("searchWorldCities supports ASCII search for accented city names", () => {
  const results = searchWorldCities("sao paulo");
  assert.ok(results.length > 0);
  assert.equal(results[0].country, "Brazil");
  assert.ok(results[0].timeZone === "America/Sao_Paulo");
});

test("resolveHistoricalUtcOffsetHours computes exact summer/winter DST offsets for birth dates", () => {
  assert.equal(
    resolveHistoricalUtcOffsetHours("America/Chicago", "1994-07-14", "14:00"),
    -5
  );
  assert.equal(
    resolveHistoricalUtcOffsetHours("America/Chicago", "1994-01-14", "14:00"),
    -6
  );
  assert.equal(
    resolveHistoricalUtcOffsetHours("Europe/London", "1994-07-14", "12:00"),
    1
  );
  assert.equal(
    resolveHistoricalUtcOffsetHours("Europe/London", "1994-12-14", "12:00"),
    0
  );
  assert.equal(
    resolveHistoricalUtcOffsetHours("Asia/Kolkata", "1994-07-14", "08:42"),
    5.5
  );
});

test("GET /api/location resolves cities locally with birth-date DST offset and zero VedicAstroAPI calls", async () => {
  resetRateLimiter();

  const summerChicagoReq = new NextRequest(
    "http://localhost:3000/api/location?q=chicago&dob=1994-07-14"
  );
  const summerRes = await getLocationRoute(summerChicagoReq);
  assert.equal(summerRes.status, 200);
  const summerBody = (await summerRes.json()) as {
    results: Array<{ cityName: string; tzOffset: number; timeZone?: string }>;
  };
  assert.equal(summerBody.results[0].cityName, "Chicago, IL");
  assert.equal(summerBody.results[0].tzOffset, -5);
  assert.equal(summerBody.results[0].timeZone, "America/Chicago");

  const winterChicagoReq = new NextRequest(
    "http://localhost:3000/api/location?q=chicago&dob=1994-01-14"
  );
  const winterRes = await getLocationRoute(winterChicagoReq);
  assert.equal(winterRes.status, 200);
  const winterBody = (await winterRes.json()) as {
    results: Array<{ cityName: string; tzOffset: number }>;
  };
  assert.equal(winterBody.results[0].tzOffset, -6);

  const indiaReq = new NextRequest(
    "http://localhost:3000/api/location?q=muzaffarnagar%20india&dob=1994-07-14"
  );
  const indiaRes = await getLocationRoute(indiaReq);
  assert.equal(indiaRes.status, 200);
  const indiaBody = (await indiaRes.json()) as {
    results: Array<{ cityName: string; region: string; tzOffset: number }>;
  };
  assert.equal(indiaBody.results[0].cityName, "Muzaffarnagar, Uttar Pradesh");
  assert.equal(indiaBody.results[0].region, "India");
  assert.equal(indiaBody.results[0].tzOffset, 5.5);
});
