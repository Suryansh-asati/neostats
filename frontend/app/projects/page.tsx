import type { Metadata } from "next";
import Workspace from "../_components/Workspace";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <Workspace />;
}
