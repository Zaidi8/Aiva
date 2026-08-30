// Aiva — doctor time-off item endpoint.
//
// DELETE /api/doctors/[id]/time-off/[timeOffId] → remove a date-range override

import { withApiCan } from "@/lib/api/with-staff";
import { noContent, failNotFound } from "@/lib/api/response";
import { deleteTimeOff } from "@/lib/doctors/schedule";

type Ctx = { params: Promise<{ id: string; timeOffId: string }> };

export const runtime = "nodejs";

export const DELETE = withApiCan<Ctx>(["doctor:write"])(async (
  _req,
  { params },
  staff,
) => {
  const { id, timeOffId } = await params;
  const ok = await deleteTimeOff(staff, id, timeOffId);
  if (!ok) return failNotFound("Time off");
  return noContent();
});
