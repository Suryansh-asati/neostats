import type { Metadata } from "next";
import Workspace from "../_components/Workspace";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return <Workspace />;
}
