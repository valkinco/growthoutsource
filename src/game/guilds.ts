import type { Guild, GuildId, Traits } from './types';

export const GUILDS: Guild[] = [
  {
    id: 'pathfinders',
    name: 'The Pathfinders',
    coreTrait: 'vision',
    description: 'Wanderers who read the land before anyone else does.',
    strength: 'Reveal wider territory and spot rivals earlier.',
    weakness: 'Settlements grow more slowly.',
  },
  {
    id: 'forgeborn',
    name: 'The Forgeborn',
    coreTrait: 'execution',
    description: 'Builders who turn plans into working systems.',
    strength: 'Cheaper routes and steadier Momentum.',
    weakness: 'Slower to explore the unknown.',
  },
  {
    id: 'unbroken',
    name: 'The Unbroken',
    coreTrait: 'grit',
    description: 'Survivors who grow stronger the harder things get.',
    strength: 'Powerful comebacks when behind.',
    weakness: 'Weaker early economy.',
  },
  {
    id: 'keepers',
    name: 'The Keepers',
    coreTrait: 'resilience',
    description: 'Guardians of trust who protect what has been built.',
    strength: 'Resist collapse and keep alliances intact.',
    weakness: 'Expands territory slowly.',
  },
];

export function startingTraits(guildId: string): Traits {
  const base: Traits = { vision: 1, execution: 1, grit: 1, resilience: 1 };
  const guild = GUILDS.find((g) => g.id === guildId);
  if (guild) base[guild.coreTrait] = 3;
  return base;
}

// Each Guild opens with one free tier-1 tech in its signature branch — a direct
// nod to how Polytopia's tribes each start with a unique tech, which is a big
// part of why tribe choice changes your opening moves rather than just a stat.
const STARTING_TECH: Record<GuildId, string> = {
  pathfinders: 'surveying',
  forgeborn: 'workshops',
  keepers: 'trade',
  unbroken: 'negotiation',
};

export function startingTech(guildId: GuildId): string[] {
  return [STARTING_TECH[guildId]];
}
