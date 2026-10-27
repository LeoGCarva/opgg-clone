import { GameIcon } from "@/components/profile/game-icon";
import { ddragonUrl, STAT_SHARD_ROWS, STAT_SHARDS, type StaticData } from "@/lib/ddragon";

const OFF = "opacity-25 grayscale";

/** Página de runas inteira; `page` = [primária, 4 runas, secundária, 2 runas, 3 fragmentos]. */
export function RunePage({ page, data }: { page: number[]; data: StaticData }) {
  const [primaryId, ...rest] = page;
  const primaryPicks = rest.slice(0, 4);
  const secondaryId = rest[4];
  const secondaryPicks = rest.slice(5, 7);
  const shards = rest.slice(7, 10);
  const primary = data.runeTrees.find((t) => t.id === primaryId);
  const secondary = data.runeTrees.find((t) => t.id === secondaryId);

  return (
    <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
      {primary && (
        <Tree name={primary.name} image={primary.image}>
          {primary.slots.map((row, i) => (
            <Row key={i} ids={row} chosen={primaryPicks} data={data} size={i === 0 ? 40 : 30} />
          ))}
        </Tree>
      )}
      <div className="space-y-4">
        {secondary && (
          <Tree name={secondary.name} image={secondary.image}>
            {/* A secundária não usa a fileira de keystones. */}
            {secondary.slots.slice(1).map((row, i) => (
              <Row key={i} ids={row} chosen={secondaryPicks} data={data} size={26} />
            ))}
          </Tree>
        )}
        <div className="space-y-1.5">
          {STAT_SHARD_ROWS.map((row, i) => (
            <div key={i} className="flex justify-center gap-2">
              {row.map((id) => (
                <GameIcon
                  key={id}
                  src={ddragonUrl.rune(STAT_SHARDS[id].image)}
                  alt={STAT_SHARDS[id].name}
                  size={20}
                  className={`rounded-full bg-ink p-0.5 ${shards[i] === id ? "" : OFF}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tree({ name, image, children }: { name: string; image: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-ink-soft">
        <GameIcon src={ddragonUrl.rune(image)} alt={name} size={20} />
        {name}
      </p>
      {children}
    </div>
  );
}

function Row({ ids, chosen, data, size }: { ids: number[]; chosen: number[]; data: StaticData; size: number }) {
  return (
    <div className="flex justify-center gap-2">
      {ids.map((id) => {
        const rune = data.runes[id];
        return (
          <GameIcon
            key={id}
            src={rune ? ddragonUrl.rune(rune.image) : null}
            alt={rune?.name ?? "Runa"}
            size={size}
            className={`rounded-full bg-ink ${chosen.includes(id) ? "" : OFF}`}
          />
        );
      })}
    </div>
  );
}
