import type { Tech } from './types';

// Four techs per branch. Each grants a concrete new capability, not a percentage tweak.
export const TECH_TREE: Tech[] = [
  // EXPLORE
  { id: 'surveying', branch: 'explore', tier: 1, cost: 3, name: 'Surveying', description: 'The Founder reveals every adjacent tile, not just the one stepped on.' },
  { id: 'cartography', branch: 'explore', tier: 2, cost: 5, name: 'Cartography', description: 'Ruined tiles show their true terrain from two tiles away.' },
  { id: 'far-sight', branch: 'explore', tier: 3, cost: 8, name: 'Far-Sight', description: 'Once per turn, reveal any single hidden tile on the map.' },
  { id: 'signal-triangulation', branch: 'explore', tier: 4, cost: 12, name: 'Signal Triangulation', description: "The Beacon's location and the Guardian's strength are always visible." },

  // BUILD
  { id: 'workshops', branch: 'build', tier: 1, cost: 3, name: 'Workshops', description: 'Upgrading a settlement costs 1 less Momentum.' },
  { id: 'roads', branch: 'build', tier: 2, cost: 5, name: 'Roads', description: "Moving between connected settlements no longer spends the Founder's movement." },
  { id: 'strongholds', branch: 'build', tier: 3, cost: 8, name: 'Strongholds', description: 'City-level settlements can no longer be captured in a single Challenge.' },
  { id: 'living-infrastructure', branch: 'build', tier: 4, cost: 12, name: 'Living Infrastructure', description: 'Every connected settlement generates +1 Momentum per turn.' },

  // CONNECT
  { id: 'trade', branch: 'connect', tier: 1, cost: 3, name: 'Trade', description: 'Building a route costs 1 less Momentum.' },
  { id: 'diplomacy', branch: 'connect', tier: 2, cost: 5, name: 'Diplomacy', description: 'You may offer the rival a truce, pausing Challenges for 3 turns.' },
  { id: 'shared-knowledge', branch: 'connect', tier: 3, cost: 8, name: 'Shared Knowledge', description: 'Connecting a new settlement instantly reveals the tiles around it.' },
  { id: 'beacon-network', branch: 'connect', tier: 4, cost: 12, name: 'Beacon Network', description: 'The Beacon can be activated remotely once all your settlements are connected.' },

  // CHALLENGE
  { id: 'negotiation', branch: 'challenge', tier: 1, cost: 3, name: 'Negotiation', description: 'See the rival’s likely move before you choose yours, one turn earlier.' },
  { id: 'market-strategy', branch: 'challenge', tier: 2, cost: 5, name: 'Market Strategy', description: 'BUILD now also adds a small Momentum refund when you win a Challenge.' },
  { id: 'strategic-pressure', branch: 'challenge', tier: 3, cost: 8, name: 'Strategic Pressure', description: 'PUSH costs less Momentum when the rival is overextended.' },
  { id: 'grand-alliance', branch: 'challenge', tier: 4, cost: 12, name: 'Grand Alliance', description: 'ENDURE can now fully reverse a lost Challenge instead of only surviving it.' },
];

export function techsForBranch(branch: string): Tech[] {
  return TECH_TREE.filter((t) => t.branch === branch).sort((a, b) => a.tier - b.tier);
}
