import { render, screen } from "@testing-library/react";
import { PointsBadge } from "../points-badge";

// ─── Fixed "now" for deterministic date math ──────────────────────────────────
// "now" = 2026-03-01T00:00:00Z (UTC midnight).
//
// All expiry dates below are explicit ISO UTC strings so that the component's
//   Math.floor((expiry.getTime() - now.getTime()) / ms_per_day)
// produces a known integer regardless of the test runner's local timezone.
//
// Verified offsets from 2026-03-01T00:00:00Z:
//   "2026-02-24T00:00:00Z"  →  -5d  (expired)
//   "2026-02-19T00:00:00Z"  → -10d  (expired)
//   "2026-03-16T00:00:00Z"  →  15d  (soon, urgent ≤ 30)
//   "2026-03-31T00:00:00Z"  →  30d  (soon, urgent ≤ 30)
//   "2026-04-15T00:00:00Z"  →  45d  (soon, not urgent > 30)
//   "2026-05-30T00:00:00Z"  →  90d  (soon, not urgent, boundary)
//   "2026-06-29T00:00:00Z"  → 120d  (ok, > 90)
//   "2026-08-28T00:00:00Z"  → 180d  (ok)
//   "2026-09-17T00:00:00Z"  → 200d  (ok)

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PointsBadge", () => {
  describe("status: none (no expiry date)", () => {
    it("renders '{balance} {pointsName}' badge when pointsExpiresAt is null", () => {
      render(
        <PointsBadge
          pointsExpiresAt={null}
          pointsBalance={10000}
          pointsName="Chase Ultimate Rewards"
        />
      );

      expect(screen.getByText(/10,000 Chase Ultimate Rewards/)).toBeInTheDocument();
    });

    it("formats balance with toLocaleString (e.g. 50,000)", () => {
      render(
        <PointsBadge
          pointsExpiresAt={null}
          pointsBalance={50000}
          pointsName="Avios"
        />
      );

      expect(screen.getByText(/50,000 Avios/)).toBeInTheDocument();
    });
  });

  describe("status: expired", () => {
    it("renders expired badge when expiry date is in the past", () => {
      // 5 days ago: 2026-03-01 − 5 = 2026-02-24
      render(
        <PointsBadge
          pointsExpiresAt="2026-02-24T00:00:00Z"
          pointsBalance={25000}
          pointsName="Miles"
        />
      );

      // Should show "25,000 pts · Expired 5d ago"
      const badge = screen.getByText(/25,000 pts/);
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toMatch(/Expired 5d ago/);
    });

    it("applies red styling for expired badges", () => {
      // 10 days ago: 2026-03-01 − 10 = 2026-02-19
      render(
        <PointsBadge
          pointsExpiresAt="2026-02-19T00:00:00Z"
          pointsBalance={1000}
          pointsName="Points"
        />
      );

      const badge = screen.getByText(/1,000 pts/);
      expect(badge.className).toMatch(/red/);
    });
  });

  describe("status: soon — urgent (≤ 30 days)", () => {
    it("renders red urgent badge when expiry is 15 days away", () => {
      // 2026-03-01 + 15 = 2026-03-16
      render(
        <PointsBadge
          pointsExpiresAt="2026-03-16T00:00:00Z"
          pointsBalance={30000}
          pointsName="Points"
        />
      );

      // Should show "30,000 pts · Expires in 15d"
      const badge = screen.getByText(/30,000 pts/);
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toMatch(/Expires in 15d/);
      expect(badge.className).toMatch(/red/);
    });

    it("renders red urgent badge when expiry is exactly 30 days away", () => {
      // 2026-03-01 + 30 = 2026-03-31
      render(
        <PointsBadge
          pointsExpiresAt="2026-03-31T00:00:00Z"
          pointsBalance={5000}
          pointsName="Points"
        />
      );

      const badge = screen.getByText(/5,000 pts/);
      expect(badge.textContent).toMatch(/Expires in 30d/);
      expect(badge.className).toMatch(/red/);
    });
  });

  describe("status: soon — non-urgent (31–90 days)", () => {
    it("renders yellow badge when expiry is 45 days away", () => {
      // 2026-03-01 + 45 = 2026-04-15
      render(
        <PointsBadge
          pointsExpiresAt="2026-04-15T00:00:00Z"
          pointsBalance={20000}
          pointsName="Points"
        />
      );

      // Should show "20,000 pts · Expires in 45d"
      const badge = screen.getByText(/20,000 pts/);
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toMatch(/Expires in 45d/);
      expect(badge.className).toMatch(/yellow/);
    });

    it("renders yellow badge when expiry is exactly 90 days away", () => {
      // 2026-03-01 + 90 = 2026-05-30
      render(
        <PointsBadge
          pointsExpiresAt="2026-05-30T00:00:00Z"
          pointsBalance={8000}
          pointsName="Points"
        />
      );

      const badge = screen.getByText(/8,000 pts/);
      expect(badge.textContent).toMatch(/Expires in 90d/);
      expect(badge.className).toMatch(/yellow/);
    });
  });

  describe("status: ok (> 90 days)", () => {
    it("renders green badge with month/year when expiry is 120 days away", () => {
      // 2026-03-01 + 120 = 2026-06-29
      render(
        <PointsBadge
          pointsExpiresAt="2026-06-29T00:00:00Z"
          pointsBalance={75000}
          pointsName="Points"
        />
      );

      // Should show "75,000 pts · Jun 2026" (month + year, not "Expires in Nd")
      const badge = screen.getByText(/75,000 pts/);
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toMatch(/\d{4}/); // contains a year
      expect(badge.textContent).not.toMatch(/Expires in/);
      expect(badge.className).toMatch(/green/);
    });

    it("applies green styling for ok badges", () => {
      // 2026-03-01 + 180 = 2026-08-28
      render(
        <PointsBadge
          pointsExpiresAt="2026-08-28T00:00:00Z"
          pointsBalance={100000}
          pointsName="Avios"
        />
      );

      const badge = screen.getByText(/100,000 pts/);
      expect(badge.className).toMatch(/green/);
    });

    it("renders month and year for ok expiry (not 'Expires in Nd')", () => {
      // 2026-03-01 + 200 = 2026-09-17
      render(
        <PointsBadge
          pointsExpiresAt="2026-09-17T00:00:00Z"
          pointsBalance={60000}
          pointsName="Points"
        />
      );

      const badge = screen.getByText(/60,000 pts/);
      // Should NOT contain "Expires in" — should have the month/year format
      expect(badge.textContent).not.toMatch(/Expires in/);
      expect(badge.textContent).not.toMatch(/Expired/);
    });
  });

  describe("balance formatting", () => {
    it("formats 1000 as 1,000", () => {
      render(
        <PointsBadge pointsExpiresAt={null} pointsBalance={1000} pointsName="pts" />
      );
      expect(screen.getByText(/1,000 pts/)).toBeInTheDocument();
    });

    it("formats 1000000 as 1,000,000", () => {
      render(
        <PointsBadge pointsExpiresAt={null} pointsBalance={1000000} pointsName="Miles" />
      );
      expect(screen.getByText(/1,000,000 Miles/)).toBeInTheDocument();
    });
  });
});
