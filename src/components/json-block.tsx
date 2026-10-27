export function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-[32rem] overflow-auto bg-surface p-4 font-mono text-xs leading-relaxed text-ink-soft">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
