//@ts-nocheck
import type { RoundResult, FinalRank } from '../services/gameSocket';

// --- MENU DE VOTE RAPIDE ---

type VoteMenuProps = {
  turnOrder: string[];
  myCharacter: string | null;
  hasVoted: boolean;
  onVote: (targetCharacter: string) => void;
};

export function VoteMenu({ turnOrder, myCharacter, hasVoted, onVote }: VoteMenuProps) {
  if (hasVoted) {
    return (
      <div className="rounded-lg border border-emerald-500/50 bg-emerald-900/30 p-4 text-center mt-4">
        <p className="text-emerald-400 font-semibold">Vote enregistré !</p>
        <p className="text-sm text-slate-300">Continuez de bluffer discrètement...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 mt-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 text-center">Qui est l'IA selon vous ?</h3>
      <div className="flex flex-wrap gap-2 justify-center">
        {turnOrder.map((character) => {
          if (character === myCharacter) return null; // On ne vote pas pour soi-même
          return (
            <button
              key={character}
              onClick={() => onVote(character)}
              className="rounded bg-sky-600 px-3 py-1 text-sm font-medium hover:bg-sky-500 transition"
            >
              {character}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- MODALE DE FIN DE ROUND ---

function formatScore(ms: number) {
  if (ms >= 9999999) return "Muet / Erreur";
  return `${(ms / 1000).toFixed(2)} s`;
}

type ScoreboardModalProps = {
  aiCharacter: string;
  results: RoundResult[];
  countdown: number | null;
};

export function ScoreboardModal({ aiCharacter, results, countdown }: ScoreboardModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-white mb-2">Fin de la manche !</h2>
        <p className="text-center text-lg mb-6">
          L'IA était : <span className="font-bold text-red-400">{aiCharacter}</span>
        </p>

        <div className="overflow-hidden rounded border border-slate-700">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Joueur</th>
                <th className="px-4 py-3">A voté pour</th>
                <th className="px-4 py-3">Score / Temps</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, index) => (
                <tr key={index} className="border-t border-slate-700 bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-white">{res.character}</td>
                  <td className="px-4 py-3">{res.target || '—'}</td>
                  <td className={`px-4 py-3 font-bold ${res.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatScore(res.score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sky-400 font-semibold animate-pulse">
            Prochaine manche dans {countdown ?? '-'} secondes...
          </p>
        </div>
      </div>
    </div>
  );
}

// --- MODALE DE FIN DE JEU ---

type GameEndModalProps = {
  winnerId: string;
  ranking: FinalRank[];
};

export function GameEndModal({ winnerId, ranking }: GameEndModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-md rounded-xl border border-yellow-600 bg-slate-900 p-8 shadow-2xl text-center">
        <h2 className="text-4xl font-bold text-yellow-500 mb-2">Partie Terminée !</h2>
        <p className="text-lg text-slate-300 mb-6">
          Le grand gagnant est <span className="font-bold text-white">{winnerId}</span> !
        </p>
        <button 
          onClick={() => window.location.href = '/'} 
          className="mt-4 rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 hover:bg-sky-400"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
