import type { RoundResult, FinalRank } from '../services/gameSocket';
import { Button } from '../components/ui';

// --- MODALE DE FIN DE ROUND ---

function formatScore(score: number) {
  return `${score} pts`;
}

type ScoreboardModalProps = {
  aiCharacter: string | null;
  results: RoundResult[];
  countdown: number | null;
  // Prolongation demandee par le serveur : l'agent d'analyse n'a pas encore
  // rendu sa note de service (voir room.js : debriefWait).
  debriefWait: { attempt: number; max: number } | null;
};

export function ScoreboardModal({ aiCharacter, results, countdown, debriefWait }: ScoreboardModalProps) {
  // Le gagnant de la manche est le premier du tableau trié
  const roundWinner = results[0];
  const aiWon = roundWinner.isAI;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-abyss-700 bg-abyss-900 p-6 shadow-2xl">
        
        {/* Affichage dynamique du gagnant */}
        {aiWon ? (
          <h2 className="text-3xl font-bold text-center text-danger-400 mb-2">L'IA a dupé tout le monde !</h2>
        ) : (
          <h2 className="text-3xl font-bold text-center text-success-400 mb-2">L'IA a été démasquée !</h2>
        )}
        
        <p className="text-center text-lg mb-6">
          L'IA incarnait : <span className="font-bold text-white">{aiCharacter}</span>
        </p>

        <div className="overflow-hidden rounded border border-abyss-700">
          <table className="w-full text-left text-sm text-abyss-300">
            <thead className="bg-abyss-800 text-xs uppercase text-abyss-400">
              <tr>
                <th className="px-4 py-3">Joueur</th>
                <th className="px-4 py-3">A voté pour</th>
                <th className="px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, index) => (
                <tr key={index} className={`border-t border-abyss-700 ${res.isAI ? 'bg-azur-900/40' : 'bg-abyss-800/50'}`}>
                  <td className="px-4 py-3 font-medium text-white">
                    {res.character} {res.isAI && <span className="ml-2 rounded bg-azur-500 px-2 py-1 text-xs">🤖BOT</span>}
                  </td>
                  <td className="px-4 py-3">{res.target || '—'}</td>
                  <td className={`px-4 py-3 font-bold ${res.isCorrect ? 'text-success-400' : 'text-danger-400'}`}>
                    +{formatScore(res.score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-center">
          {debriefWait && (
            <p className="mb-2 text-sm text-warning-400">
              L'analyse de la manche traîne (tentative {debriefWait.attempt}/{debriefWait.max}) :
              la pause est prolongée le temps que la note arrive.
            </p>
          )}
          <p className="text-azur-400 font-semibold animate-pulse">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss-950/95 p-4 backdrop-blur-md">
      <div className="flex h-[85vh] w-full max-w-6xl gap-6 rounded-xl border border-abyss-700 bg-abyss-900 p-6 shadow-2xl">
        
        {/* COLONNE GAUCHE : SCOREBOARD */}
        <div className="flex w-1/3 flex-col border-r border-abyss-700 pr-6">
          <h2 className="mb-2 text-3xl font-bold text-warning-400">Partie Terminée !</h2>
          <p className="mb-6 text-sm text-abyss-300">
            Gagnant : <span className="font-bold text-white">{winnerId}</span>
          </p>

          <div className="flex-1 overflow-y-auto rounded border border-abyss-700">
            <table className="w-full text-left text-sm text-abyss-300">
              <thead className="bg-abyss-800 text-xs uppercase text-abyss-400">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Joueur</th>
                  <th className="px-3 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((rank, index) => (
                  <tr key={rank.playerId} className="border-t border-abyss-700 bg-abyss-800/50">
                    <td className="px-3 py-2 font-bold text-white">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-white">
                      {rank.name}
                      {rank.isAI && <span className="ml-2 rounded bg-azur-500 px-1 py-0.5 text-[10px]">BOT</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-success-400">
                      {rank.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* NOUVEAU : Les deux boutons d'action */}
          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="success"
              size="lg"
              fullWidth
              onClick={onReplay}
            >
              Rejouer
            </Button>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => window.location.href = '/'}
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>

        {/* COLONNE DROITE : HISTORIQUE DU CHAT */}
        <div className="flex w-2/3 flex-col">
          <h3 className="mb-4 text-xl font-bold text-white">Débriefing (Replay du chat)</h3>
          
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-abyss-800 bg-abyss-950 p-4">
            {history.map((msg, idx) => {
              const isAI = msg.isAI; 
              
              return (
                <div key={idx} className={`flex flex-col rounded-lg p-3 ${isAI ? 'border border-azur-500/30 bg-azur-900/40' : 'border border-abyss-700 bg-abyss-800/50'}`}>
                  <span className={`mb-1 text-xs font-bold ${isAI ? 'text-azur-400' : 'text-abyss-400'}`}>
                    {msg.sender} {isAI && "(L'IMPOSTEUR)"}
                  </span>
                  <span className="text-sm text-abyss-300">{msg.text}</span>
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
  reconnect_expired: "Ta place était réservée jusqu'à la fin de la manche : elle vient d'expirer.",
  account_in_use: "Ce compte a déjà un joueur en attente ou en partie dans une autre session. Termine cette partie avant de rejouer ici.",
  session_replaced: "Cette session a été reprise dans un autre onglet : celui-ci s'est mis en retrait pour éviter le ping-pong. « Rejouer » repart proprement.",
};

export function RoomClosedModal({ code, onReplay }: { code: string; onReplay: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss-950/90 backdrop-blur-md">
      <div className="w-full max-w-md rounded-xl border border-abyss-700 bg-abyss-900 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Séance levée</h2>
        <p className="text-abyss-400 mb-6">
          {MOTIFS[code] ?? 'La séance a pris fin.'}
        </p>

        <Button
          variant="success"
          size="lg"
          fullWidth
          onClick={onReplay}
        >
          Rejouer
        </Button>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          className="mt-2"
          onClick={() => window.location.href = '/'}
        >
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
}
