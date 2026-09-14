//@ts-nocheck
import type { RoundResult, FinalRank } from '../services/gameSocket';
import { useState } from 'react';

// --- MENU DE VOTE RAPIDE ---

type VoteMenuProps = {
  turnOrder: string[];
  myCharacter: string | null;
  hasVoted: boolean;
  leftCharacters: string[];
  onVote: (targetCharacter: string) => void;
};

export function VoteMenu({ turnOrder, myCharacter, hasVoted, leftCharacters, onVote }: VoteMenuProps) {
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

          // Un joueur qui s'est deconnecte est forcement humain : le bot n'a
          // pas de socket et ne part jamais. Voter pour lui serait une defaite
          // certaine, on ne laisse donc pas le piege ouvert.
          const hasLeft = leftCharacters.includes(character);
          const isSelected = selected === character;

          return (
            <button
              key={character}
              disabled={hasLeft}
              onClick={() => setSelected(character)}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                hasLeft
                  ? 'bg-slate-700 text-slate-500 line-through cursor-not-allowed'
                  : isSelected
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
  history: {sender: string; text: string; isAI: boolean}[];
  onReplay: () => void;
};

export function GameEndModal({ winnerId, ranking, history, onReplay }: GameEndModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="flex h-[85vh] w-full max-w-6xl gap-6 rounded-xl border border-yellow-600 bg-slate-900 p-6 shadow-2xl">
        
        {/* COLONNE GAUCHE : SCOREBOARD */}
        <div className="flex w-1/3 flex-col border-r border-slate-700 pr-6">
          <h2 className="mb-2 text-3xl font-bold text-yellow-500">Partie Terminée !</h2>
          <p className="mb-6 text-sm text-slate-300">
            Gagnant : <span className="font-bold text-white">{winnerId}</span>
          </p>

          <div className="flex-1 overflow-y-auto rounded border border-slate-700">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Joueur</th>
                  <th className="px-3 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((rank, index) => (
                  <tr key={rank.playerId} className="border-t border-slate-700 bg-slate-800/50">
                    <td className="px-3 py-2 font-bold text-white">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-white">
                      {rank.playerId} 
                      {rank.isAI && <span className="ml-2 rounded bg-indigo-500 px-1 py-0.5 text-[10px]">BOT</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-400">
                      {rank.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* NOUVEAU : Les deux boutons d'action */}
          <div className="mt-4 flex flex-col gap-2">
            <button 
              onClick={onReplay} 
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Rejouer
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="w-full rounded-lg border border-slate-600 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>

        {/* COLONNE DROITE : HISTORIQUE DU CHAT */}
        <div className="flex w-2/3 flex-col">
          <h3 className="mb-4 text-xl font-bold text-slate-200">Débriefing (Replay du chat)</h3>
          
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-4">
            {history.map((msg, idx) => {
              const isAI = msg.isAI; 
              
              return (
                <div key={idx} className={`flex flex-col rounded-lg p-3 ${isAI ? 'border border-indigo-500/30 bg-indigo-900/40' : 'border border-slate-700 bg-slate-800/50'}`}>
                  <span className={`mb-1 text-xs font-bold ${isAI ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {msg.sender} {isAI && "(L'IMPOSTEUR)"}
                  </span>
                  <span className="text-sm text-slate-200">{msg.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MODALE DE FERMETURE ANORMALE ---
// Fin de partie autre que la fin normale : plus assez de joueurs, ou room
// desertee. Il n'y a pas de classement a montrer dans ces cas-la.

const MOTIFS: Record<string, string> = {
  not_enough_players: "Trop de membres ont quitté la séance : le quorum n'est plus atteint.",
  empty_room: 'La séance a été levée, plus aucun membre n\'était présent.',
  agent_failure: 'La séance a été interrompue pour raison technique.',
};

export function RoomClosedModal({ code, onReplay }: { code: string; onReplay: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-md rounded-xl border border-slate-600 bg-slate-900 p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-100 mb-3">Séance levée</h2>
        <p className="text-slate-400 mb-6">
          {MOTIFS[code] ?? 'La séance a pris fin.'}
        </p>

        <button
          onClick={onReplay}
          className="w-full rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400 transition"
        >
          Rejouer
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className="mt-2 w-full rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 transition"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}