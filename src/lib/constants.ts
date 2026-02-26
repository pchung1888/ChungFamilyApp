export const EXPENSE_CATEGORIES = [
  { value: "hotel", label: "Hotel" },
  { value: "flight", label: "Flight" },
  { value: "food", label: "Food" },
  { value: "gas", label: "Gas" },
  { value: "ev_charging", label: "EV Charging" },
  { value: "tours", label: "Tours & Activities" },
  { value: "shopping", label: "Shopping" },
  { value: "other", label: "Other" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];

export const TRIP_TYPES = [
  { value: "road_trip", label: "Road Trip" },
  { value: "flight", label: "Flight" },
  { value: "local", label: "Local" },
] as const;

export type TripType = (typeof TRIP_TYPES)[number]["value"];

export const ITINERARY_TYPES = [
  { value: "accommodation", label: "Accommodation" },
  { value: "activity",      label: "Activity" },
  { value: "transport",     label: "Transport" },
  { value: "flight",        label: "Flight" },
] as const;

export type ItineraryItemType = (typeof ITINERARY_TYPES)[number]["value"];
