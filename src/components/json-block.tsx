export function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-[32rem] overflow-auto rounded-md bg-zinc-900 p-4 font-mono text-xs leading-relaxed text-zinc-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
