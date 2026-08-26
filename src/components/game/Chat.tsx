import { useEffect, useRef, useState } from "react";
import { sendMessage } from "@/lib/actions";
import type { ChatMessage, GamePlayer } from "@/lib/use-game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Chat({
  gameId,
  me,
  messages,
  compact = false,
  allowAllies = false,
}: {
  gameId: string;
  me: GamePlayer | null;
  messages: ChatMessage[];
  compact?: boolean;
  allowAllies?: boolean;
}) {
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"all" | "allies">("all");
  const endRef = useRef<HTMLDivElement>(null);

  const visible = messages.filter((m) => m.channel === channel);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [visible.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {allowAllies && (
        <div className="mb-2 flex gap-1">
          {(["all", "allies"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={`hud-label rounded px-2 py-1 ${
                channel === c ? "bg-primary text-primary-foreground" : "bg-muted/50"
              }`}
            >
              {c === "all" ? "Geral" : "Aliados"}
            </button>
          ))}
        </div>
      )}
      <div
        className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-md bg-muted/30 p-3 text-sm ${
          compact ? "max-h-40" : ""
        }`}
      >
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
        )}
        {visible.map((m) => (
          <p key={m.id}>
            <span className="font-display font-semibold" style={{ color: m.color }}>
              {m.username}:
            </span>{" "}
            <span className="text-foreground/90">{m.content}</span>
          </p>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!me) return;
          await sendMessage(gameId, me, text, channel);
          setText("");
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem…"
          maxLength={400}
        />
        <Button type="submit" size="sm">
          Enviar
        </Button>
      </form>
    </div>
  );
}
