import Link from "next/link";
import type { QueueFilter } from "@/lib/services/profile";

const TABS: { value: QueueFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "solo", label: "Solo/Duo" },
  { value: "flex", label: "Flex" },
];

export function QueueTabs({ basePath, active }: { basePath: string; active: QueueFilter }) {
  return (
    <nav className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === "all" ? basePath : `${basePath}?queue=${tab.value}`}
          className={`rounded-md px-3 py-1.5 ${
            tab.value === active ? "bg-zinc-800 font-medium text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
