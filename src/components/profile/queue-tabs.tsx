import Link from "next/link";
import type { QueueFilter } from "@/lib/services/profile";

const TABS: { value: QueueFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "solo", label: "Solo/Duo" },
  { value: "flex", label: "Flex" },
];

export function QueueTabs({ basePath, active }: { basePath: string; active: QueueFilter }) {
  return (
    <nav className="flex gap-1 border border-line bg-surface p-1 text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === "all" ? basePath : `${basePath}?queue=${tab.value}`}
          className={`flex h-11 items-center px-4 font-semibold ${
            tab.value === active ? "bg-ink text-white" : "text-ink hover:bg-canvas"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
