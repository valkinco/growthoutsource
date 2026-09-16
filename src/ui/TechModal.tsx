import type { GameState, TechBranch } from '../game/types';
import { techsForBranch } from '../game/tech';

interface Props {
  state: GameState;
  onUnlock: (techId: string, cost: number) => void;
  onClose: () => void;
}

const BRANCHES: TechBranch[] = ['explore', 'build', 'connect', 'challenge'];
const BRANCH_LABEL: Record<TechBranch, string> = {
  explore: 'Explore',
  build: 'Build',
  connect: 'Connect',
  challenge: 'Challenge',
};

export function TechModal({ state, onUnlock, onClose }: Props) {
  const side = state.activeSide;
  const unlockedForSide = state.unlockedTech[side];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card tech-modal" onClick={(e) => e.stopPropagation()}>
        <h2>The Growth Tree</h2>
        <div className="tech-branches">
          {BRANCHES.map((branch) => (
            <div key={branch} className="tech-branch">
              <h3>{BRANCH_LABEL[branch]}</h3>
              {techsForBranch(branch).map((tech) => {
                const unlocked = unlockedForSide.includes(tech.id);
                const priorTiersDone = techsForBranch(branch)
                  .filter((t) => t.tier < tech.tier)
                  .every((t) => unlockedForSide.includes(t.id));
                const locked = !priorTiersDone;
                return (
                  <button
                    key={tech.id}
                    className={`tech-node ${unlocked ? 'unlocked' : locked ? 'locked' : ''}`}
                    disabled={unlocked || locked || state.momentum[side] < tech.cost}
                    onClick={() => onUnlock(tech.id, tech.cost)}
                  >
                    <strong>{tech.name}</strong>
                    <span>{tech.description}</span>
                    <em>{unlocked ? 'Unlocked' : `${tech.cost} Momentum`}</em>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
