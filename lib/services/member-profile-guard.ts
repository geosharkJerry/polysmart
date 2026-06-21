import { NextResponse } from "next/server";
import { RegisteredUser } from "@/lib/types";
import { memberProfileIsComplete } from "@/lib/services/users";

export function requireCompletedMemberProfile(user: RegisteredUser) {
  if (memberProfileIsComplete(user)) {
    return null;
  }

  return NextResponse.json(
    {
      code: "MEMBER_PROFILE_INCOMPLETE",
      message: "Complete the member profile before payment, account binding, wallet funding, or execution is released."
    },
    { status: 403 }
  );
}
