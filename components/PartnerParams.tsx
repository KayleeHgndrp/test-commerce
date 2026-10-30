"use client";

import { useEffect } from "react";
import { capturePartnerParams } from "@/lib/partners";

// Picks up ?ref= and ?code= from the page a visitor lands on.
export function PartnerParams() {
  useEffect(() => {
    capturePartnerParams(window.location.search);
  }, []);
  return null;
}
