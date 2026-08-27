import { Metadata } from "next";
import AdvertiseClient from "./AdvertiseClient";

export const metadata: Metadata = {
  title: "Tangaza Nasi | Partner & Sponsor Advertising | Sumaiyyah",
  description: "Reach thousands of daily food lovers and corporate diners in Dar es Salaam through high-impact digital placements on Sumaiyyah.",
};

export const dynamic = "force-dynamic";

export default function AdvertisePage() {
  return <AdvertiseClient />;
}
