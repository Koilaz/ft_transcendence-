//@ts-nocheck
import type { RoundResult, FinalRank } from '../services/gameSocket';
import { useState } from 'react';

// --- MENU DE VOTE RAPIDE ---

type VoteMenuProps = {
  turnOrder: string[];
  myCharacter: string | null;
  hasVoted: boolean;
  onVote: (targetCharacter: string) => void;
};

export function VoteMenu({ turnOrder, myCharacter, hasVoted, onVote }: VoteMenuProps) {
  // Nouvel état local pour stocker la sélection avant validation
  const [selected, setSelected] = useState<string | null>(null);

  if (hasVoted) {
    return (
      <div className="rounded-lg border border-emerald-500/50 bg-emerald-900/30 p-4 text-center mt-4">
        <p className="text-emerald-400 font-semibold">Vote enregistré !</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 mt-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 text-center">
        Qui est l'IA selon vous ?
      </h3>
      
      {/* Liste des personnages sélectionnables */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {turnOrder.map((character) => {
          if (character === myCharacter) return null;
          
          const isSelected = selected === character;
          
          return (
            <button
              key={character}
              onClick={() => setSelected(character)}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                isSelected 
                  ? 'bg-orange-500 text-slate-900 shadow-[0_0_8px_rgba(245,166,35,0.6)]' 
                  : 'bg-sky-600 text-white hover:bg-sky-500'
              }`}
            >
              {character}
            </button>
          );
        })}
      </div>

      {/* Bouton de validation final */}
      <div className="flex justify-center">
        <button
          disabled={!selected}
          onClick={() => selected && onVote(selected)}
          className={`rounded-lg px-6 py-2 text-sm font-bold transition ${
            selected
              ? 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          Valider le vote
        </button>
      </div>
    </div>
  );
}

// --- MODALE DE FIN DE ROUND ---

function formatScore(score: number) {
  return `${score} pts`;
}

type ScoreboardModalProps = {
  aiCharacter: string;
  results: RoundResult[];
  countdown: number | null;
};

export function ScoreboardModal({ aiCharacter, results, countdown }: ScoreboardModalProps) {
  // Le gagnant de la manche est le premier du tableau trié
  const roundWinner = results[0];
  const aiWon = roundWinner.isAI;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        
        {/* Affichage dynamique du gagnant */}
        {aiWon ? (
          <h2 className="text-3xl font-bold text-center text-red-500 mb-2">L'IA a dupé tout le monde !</h2>
        ) : (
          <h2 className="text-3xl font-bold text-center text-emerald-400 mb-2">L'IA a été démasquée !</h2>
        )}
        
        <p className="text-center text-lg mb-6">
          L'IA incarnait : <span className="font-bold text-white">{aiCharacter}</span>
        </p>

        <div className="overflow-hidden rounded border border-slate-700">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Joueur</th>
                <th className="px-4 py-3">A voté pour</th>
                <th className="px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, index) => (
                <tr key={index} className={`border-t border-slate-700 ${res.isAI ? 'bg-indigo-900/40' : 'bg-slate-800/50'}`}>
                  <td className="px-4 py-3 font-medium text-white">
                    {res.character} {res.isAI && <span className="ml-2 rounded bg-indigo-500 px-2 py-1 text-xs">🤖BOT</span>}
                  </td>
                  <td className="px-4 py-3">{res.target || '—'}</td>
                  <td className={`px-4 py-3 font-bold ${res.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    +{formatScore(res.score)}
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

        {/* Le tableau des scores finaux */}
        <div className="mb-6 overflow-hidden rounded border border-slate-700 text-left">
          <table className="w-full text-sm text-slate-300">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Joueur</th>
                <th className="px-4 py-3 text-right">Score Total</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((rank, index) => (
                <tr key={rank.playerId} className="border-t border-slate-700 bg-slate-800/50">
                  <td className="px-4 py-3 font-bold text-white">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">
                    {rank.playerId} 
                    {rank.isAI && <span className="ml-2 rounded bg-indigo-500 px-2 py-1 text-[10px]">🤖 BOT</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">
                    {rank.score} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button 
          onClick={() => window.location.href = '/'} 
          className="mt-2 w-full rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 hover:bg-sky-400 transition"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}