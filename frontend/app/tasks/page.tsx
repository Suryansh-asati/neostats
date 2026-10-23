import type { Metadata } from "next";
import Workspace from "../_components/Workspace";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return <Workspace />;
}
