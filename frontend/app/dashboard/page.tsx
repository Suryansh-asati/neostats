import type { Metadata } from "next";
import Workspace from "../_components/Workspace";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <Workspace />;
}
