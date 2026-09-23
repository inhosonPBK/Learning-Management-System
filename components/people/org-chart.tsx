"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initialsOf } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

export interface PersonNode {
  id: string;
  name: string;
  nameKo: string | null;
  title: string | null;
  email: string;
  isActive: boolean;
  isIntern: boolean;
  isYou: boolean;
  children: PersonNode[];
}

export interface TeamNode {
  code: string;
  name: string;      // localized
  altName: string;   // other language
  lead: PersonNode | null;
  count: number;     // active members incl. lead
  /** lead's subtree (excludes the lead) */
  tree: PersonNode[];
}

export interface EntityNode {
  code: "PBK" | "PK" | "SHARED";
  label: string;
  description: string;
  count: number;
  teams: TeamNode[];
}

export interface OrgChartLabels {
  lead: string;
  you: string;
  inactive: string;
  expandAll: string;
  collapseAll: string;
  members: string;
  reports: string; // "직속 {n}명" — we pass a template with {n}
}

const ENTITY_COLORS: Record<EntityNode["code"], string> = {
  PBK: "bg-tile-green",
  PK: "bg-tile-blue",
  SHARED: "bg-brand-gold",
};

export function OrgChart({ gm, entities, labels, defaultExpanded }: { gm: PersonNode | null; entities: EntityNode[]; labels: OrgChartLabels; defaultExpanded: boolean }) {
  const allCodes = entities.flatMap((e) => e.teams.map((t) => t.code));
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultExpanded ? allCodes : []));
  const allOpen = allCodes.length > 0 && allCodes.every((c) => open.has(c));

  const toggle = (code: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setOpen(new Set(allOpen ? [] : allCodes))}>
          {allOpen ? <ChevronRight /> : <ChevronDown />}
          {allOpen ? labels.collapseAll : labels.expandAll}
        </Button>
      </div>

      {/* Level 0 — GM */}
      {gm && (
        <div className="flex flex-col items-center">
          <PersonCard person={gm} labels={labels} highlight className="w-full max-w-sm" badge="GM" />
          <span className="h-8 w-px bg-border" aria-hidden />
        </div>
      )}

      {/* Level 1 — entities, connected by a horizontal rail on md+ */}
      <div className="relative grid gap-6 md:grid-cols-3">
        <span className="absolute left-[16.67%] right-[16.67%] top-0 hidden h-px bg-border md:block" aria-hidden />
        {entities.map((entity) => (
          <div key={entity.code} className="relative flex flex-col items-stretch md:pt-8">
            <span className="absolute left-1/2 top-0 hidden h-8 w-px bg-border md:block" aria-hidden />
            <div className={cn("flex items-center justify-between rounded-xl px-4 py-3 text-white shadow-sm", ENTITY_COLORS[entity.code])}>
              <div>
                <div className="text-lg font-extrabold tracking-tight">{entity.label}</div>
                <div className="text-xs text-white/80">{entity.description}</div>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold"><Users className="size-4 opacity-80" />{entity.count}</div>
            </div>

            {/* Level 2 — teams (vertical rail) */}
            <div className="relative mt-3 flex flex-col gap-3 pl-4">
              <span className="absolute left-1.5 top-0 bottom-6 w-px bg-border" aria-hidden />
              {entity.teams.map((team) => (
                <TeamCard key={team.code} team={team} open={open.has(team.code)} onToggle={() => toggle(team.code)} labels={labels} />
              ))}
              {!entity.teams.length && <p className="py-4 text-center text-xs text-muted-foreground">—</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamCard({ team, open, onToggle, labels }: { team: TeamNode; open: boolean; onToggle: () => void; labels: OrgChartLabels }) {
  return (
    <div className="relative rounded-xl border bg-white shadow-sm">
      <span className="absolute -left-2.5 top-7 h-px w-2.5 bg-border" aria-hidden />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-muted/40"
      >
        {team.lead ? (
          <Avatar className="size-10 border-2 border-brand-yellow">
            <AvatarFallback className="bg-brand-navy text-xs font-bold text-white">{initialsOf(team.lead.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="size-10"><AvatarFallback className="bg-muted text-xs">—</AvatarFallback></Avatar>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-semibold text-brand-navy">{team.name}</span>
            <span className="text-xs text-muted-foreground">{team.altName}</span>
          </div>
          {team.lead && (
            <div className="truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{team.lead.name}</span>
              {team.lead.title ? ` · ${team.lead.title}` : ""}
            </div>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Users className="size-3.5" />{team.count}</span>
        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t px-3 pb-3 pt-2">
          {team.tree.length ? (
            <PersonTree nodes={team.tree} labels={labels} depth={0} />
          ) : (
            <p className="px-2 py-2 text-xs text-muted-foreground">—</p>
          )}
        </div>
      )}
    </div>
  );
}

function PersonTree({ nodes, labels, depth }: { nodes: PersonNode[]; labels: OrgChartLabels; depth: number }) {
  return (
    <ul className={cn("flex flex-col", depth > 0 && "ml-4 border-l border-dashed pl-3")}>
      {nodes.map((p) => (
        <li key={p.id} className="py-0.5">
          <PersonRow person={p} labels={labels} />
          {p.children.length > 0 && <PersonTree nodes={p.children} labels={labels} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

function PersonRow({ person, labels }: { person: PersonNode; labels: OrgChartLabels }) {
  const manages = person.children.length;
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40", !person.isActive && "opacity-50")}>
      <Avatar className="size-7">
        <AvatarFallback className={cn("text-[10px] font-bold", manages ? "bg-brand-blue text-white" : "bg-brand-navy text-white")}>{initialsOf(person.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-sm leading-tight">
          <span className="font-medium">{person.name}</span>
          {person.nameKo && <span className="text-xs text-muted-foreground">{person.nameKo}</span>}
          {person.isIntern && <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-tile-green">Intern</Badge>}
          {manages > 0 && <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-brand-blue">{labels.reports.replace("{n}", String(manages))}</Badge>}
          {!person.isActive && <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{labels.inactive}</Badge>}
          {person.isYou && <Badge className="h-4 bg-brand-yellow px-1.5 text-[10px] text-brand-navy-deep">{labels.you}</Badge>}
        </div>
        <div className="truncate text-xs text-muted-foreground">{person.title}</div>
      </div>
      <a href={`mailto:${person.email}`} className="text-muted-foreground hover:text-brand-blue" title={person.email} aria-label={person.email}><Mail className="size-3.5" /></a>
    </div>
  );
}

function PersonCard({ person, labels, highlight, className, badge }: { person: PersonNode; labels: OrgChartLabels; highlight?: boolean; className?: string; badge?: string }) {
  return (
    <div className={cn("flex items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm", highlight && "border-brand-yellow ring-2 ring-brand-yellow/30", className)}>
      <Avatar className="size-12 border-2 border-brand-yellow">
        <AvatarFallback className="bg-brand-navy text-sm font-bold text-white">{initialsOf(person.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-brand-navy">{person.name}</span>
          {badge && <Badge className="bg-brand-yellow text-brand-navy-deep">{badge}</Badge>}
          {person.isYou && <Badge variant="outline" className="text-[10px] text-brand-blue">{labels.you}</Badge>}
        </div>
        <div className="truncate text-sm text-muted-foreground">{person.title}</div>
      </div>
      <a href={`mailto:${person.email}`} className="text-muted-foreground hover:text-brand-blue" title={person.email} aria-label={person.email}><Mail className="size-4" /></a>
    </div>
  );
}
