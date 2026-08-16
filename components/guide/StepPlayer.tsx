'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GuideStep } from './guide-data';

const STEP_MS = 4200;

/** Pemutar langkah bergaya video: screenshot berganti otomatis + kendali. */
export function StepPlayer({ steps }: { steps: GuideStep[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (i: number) => setIndex(((i % steps.length) + steps.length) % steps.length),
    [steps.length],
  );

  useEffect(() => {
    if (!playing) return;
    timer.current = setTimeout(() => go(index + 1), STEP_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, index, go]);

  const step = steps[index];

  return (
    <div className="flex flex-col gap-3">
      {/* Layar */}
      <div className="relative overflow-hidden border border-border bg-muted/30">
        {step.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={step.image}
            alt={`Langkah ${index + 1}: ${step.title}`}
            className="max-h-[430px] w-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-muted-foreground">
            <span className="text-sm">{step.title}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 text-white">
          <p className="m-0 text-[13px] font-bold leading-snug">{step.title}</p>
          {step.desc ? <p className="m-0 mt-0.5 text-xs leading-snug text-white/85">{step.desc}</p> : null}
        </div>
      </div>

      {/* Progress + kendali */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Langkah sebelumnya" onClick={() => go(index - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={playing ? 'Jeda' : 'Putar'}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <div className="flex h-5 flex-1 items-center gap-1">
          {steps.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Langkah ${i + 1}: ${s.title}`}
              className="group flex h-5 flex-1 items-center"
              onClick={() => {
                setIndex(i);
                setPlaying(true);
              }}
            >
              <span
                className={cn(
                  'h-1 w-full rounded-full transition-colors',
                  i === index ? 'bg-primary' : i < index ? 'bg-primary/40' : 'bg-border group-hover:bg-muted-foreground/40',
                )}
              />
            </button>
          ))}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {index + 1}/{steps.length}
        </span>
        <Button variant="outline" size="icon-sm" aria-label="Langkah berikutnya" onClick={() => go(index + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Aksi langkah */}
      {step.action ? (
        <p className="m-0 inline-flex w-fit items-center gap-1.5 rounded border border-primary/30 bg-primary/5 px-2.5 py-1 text-[12px] font-medium text-primary">
          <span aria-hidden>➜</span>
          {step.action}
        </p>
      ) : null}
    </div>
  );
}
