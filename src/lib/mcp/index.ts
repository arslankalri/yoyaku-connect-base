import { auth, defineMcp } from "@lovable.dev/mcp-js";

import cancelAppointment from "./tools/cancel-appointment";
import createAppointment from "./tools/create-appointment";
import getBusinessOverview from "./tools/get-business-overview";
import listAppointments from "./tools/list-appointments";
import listCustomers from "./tools/list-customers";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "nagi-ai-voice",
  title: "NAGI AI Voice",
  version: "0.1.0",
  instructions:
    "Tools for the NAGI AI reception platform. Use `get_business_overview` first to learn the business profile, opening hours, services and staff (with their ids). Use `list_appointments` and `list_customers` to read the schedule, `create_appointment` to book (end time comes from the service duration) and `cancel_appointment` to cancel. All data is scoped to the signed-in owner's business.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getBusinessOverview,
    listAppointments,
    listCustomers,
    createAppointment,
    cancelAppointment,
  ],
});
