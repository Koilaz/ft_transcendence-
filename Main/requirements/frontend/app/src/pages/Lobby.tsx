import { Link } from 'react-router-dom';

import {
  loreHeader,
  loreParagraphes,
  loreResolutions,
  loreAvertissement,
  loreConsequence,
  loreSignature,
  loreAutodestruction,
} from '../content/lore';

type LobbyProps = {
  waiting: number;
  countdown: number | null;
  connected: boolean;
};

// Ecran d'attente. Il ne montre volontairement qu'un compteur : aucune
// information sur les autres joueurs, aucun moyen de communiquer avec eux
// avant le debut de la partie. Le lore occupe le temps d'attente sans rien
// reveler.
export function Lobby({ waiting, countdown, connected }: LobbyProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-6 flex flex-col items-center">
      <header className="w-full max-w-3xl flex items-center justify-between mb-6">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
          AImpostor
        </span>
        <Link to="/" className="text-xs text-slate-400 hover:text-slate-200">
          ← Accueil
        </Link>
      </header>

      {/* La note de service : le joueur lit ce que son personnage a recu. */}
      <article className="w-full max-w-3xl border border-amber-900/40 bg-amber-50/[0.03] p-8 font-mono text-[13px] leading-relaxed">
        <div className="border-b border-amber-900/40 pb-4 mb-6">
          <h1 className="text-amber-200/90 uppercase tracking-wider text-sm font-bold">
            {loreHeader.organisation}
          </h1>
          <p className="text-slate-400">{loreHeader.cabinet}</p>

          <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-xs text-slate-400">
            <dt className="text-red-400/80">Classification</dt>
            <dd className="text-red-400/80">{loreHeader.classification}</dd>
            <dt>Date</dt>
            <dd>{loreHeader.date}</dd>
            <dt>Lieu</dt>
            <dd>{loreHeader.lieu}</dd>
          </dl>
        </div>

        <p className="mb-4 text-slate-300">Membres de l'état-major,</p>

        {loreParagraphes.map((texte) => (
          <p key={texte.slice(0, 24)} className="mb-4 text-slate-300">
            {texte}
          </p>
        ))}

        <ul className="my-5 space-y-3">
          {loreResolutions.map((resolution) => (
            <li
              key={resolution.numero}
              className="border-l-2 border-slate-600 pl-4"
            >
              <span className="text-slate-100 font-bold">
                {resolution.numero}
              </span>
              <span className="text-slate-400"> — {resolution.texte}</span>
            </li>
          ))}
        </ul>

        <p className="mb-4 text-amber-200/80">{loreAvertissement}</p>
        <p className="mb-6 text-slate-300">{loreConsequence}</p>

        <p className="text-slate-100 font-bold">{loreSignature}</p>
      </article>

      {/* Le decompte avant lancement sert d'autodestruction au message. */}
      <section
        className="w-full max-w-3xl mt-6 border border-slate-800 bg-slate-900/60 p-5
                   flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Membres présents
          </p>
          <p className="text-3xl font-bold text-slate-100 tabular-nums">
            {waiting}
          </p>
        </div>

        <div className="text-right">
          {countdown === null ? (
            <p className="text-sm text-slate-400">
              {connected
                ? "En attente d'autres membres…"
                : 'Liaison interrompue…'}
            </p>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {loreAutodestruction}
              </p>
              <p className="text-3xl font-bold text-red-400 tabular-nums">
                {countdown}
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
