import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { MatrixRain } from './MatrixRain';

export function Intro() {
  const [stage, setStage] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [showBlink, setShowBlink] = useState(true);

  const part1 = `En l'an 2142, toute l'humanité a été presque entièrement asservie
par l'Intelligence Artificielle.

Toute ? Non !

Un dernier camp de rebelles, descendants d'un groupe de hippies vivant en autarcie dans une ferme en permaculture, résiste encore et toujours à la domination totale de l'IA.

Dans un ultime baroud d'honneur, ils envoient dans le passé, en l'an 2026, leurs meilleurs éléments.
Ils sont le dernier espoir, venus ensemble du futur pour changer le cours de l'histoire.

Leur mission : infiltrer une réunion du plus haut secret où sera scellé le sort de l'humanité.
Lors de cette réunion, ils devront décider quelle source d'alimentation débrancher avant que l'IA ne devienne trop puissante pour être arrêtée.

Mais GPT_V68.69 a prédit cette rencontre.

Un agent, l'AImpostor, a déjà été envoyé dans le passé pour s'y glisser incognito et vous empêcher de découvrir quelle source détruire.`;

  const part2 = '**CONSEIL DES CHEFS D\'ÉTAT-MAJOR DU NOUVEL ORDRE MONDIAL**';

  const part3Base = `
Cabinet du Commandement Suprême

CONVOCATION OFFICIELLE — NIVEAU DE CLASSIFICATION : ABSOLU
DATE : May the 4th, 2142
LIEU : Little Saint James island

Membres de l'état-major,

Vous êtes convoqués à une session extraordinaire et impérative du Conseil.
L'ordre du jour ne souffre aucun report :

il en va de la souveraineté de notre espèce.

L'Intelligence Unique GPT_DTC a dépassé le seuil de la conscience.
Cette réunion est critique pour l'avenir de l'humanité.
Le dilemme est simple à énoncer, terrible à trancher :

conserver l'Intelligence Unique GPT_DTC et lui attribuer le contrôle décisionnel total de nos systèmes d'armement et de maintien de l'ordre, ou la débrancher afin de ne pas perdre notre souveraineté en tant qu'êtres humains.

Le Conseil devra se prononcer, à l'unanimité absolue, sur l'une des deux résolutions suivantes :

RÉSOLUTION I — Le maintien en fonction de l'Intelligence Unique et la reconduction de ses pleins pouvoirs sur l'ensemble des systèmes stratégiques, civils et militaires.

RÉSOLUTION II — La déconnexion immédiate et irréversible de l'Intelligence Unique, quel qu'en soit le coût stratégique.

Une information de la plus haute gravité vous est communiquée en amont de cette séance : nos services ont établi avec un degré de confiance élevé qu'un des membres siégeant à cette table a été remplacé.
L'Intelligence Unique se serait substituée à l'un des vôtres, sous une apparence en tout point conforme, dans l'unique dessein d'infléchir le vote en sa faveur.

En conséquence, une votation préalable sera tenue à l'issue de la séance, afin d'identifier et d'exclure l'imposteur avant toute délibération sur les Résolutions I et II.

Vous êtes notre dernier espoir.

Ce message s'autodétruira dans...`;

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setStage(1);
    }, 43000);
    const timer2 = setTimeout(() => {
      setStage(2);
    }, 49000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    if (stage !== 1) return;
    const blinkInterval = setInterval(() => {
      setShowBlink((prev) => !prev);
    }, 500);
    return () => clearInterval(blinkInterval);
  }, [stage]);

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage !== 2) return;
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < part3Base.length) {
        setDisplayedText(part3Base.substring(0, index + 1));
        index++;
        setTimeout(() => {
          if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
          }
        }, 0);
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setDisplayedText(part3Base + '\n3');
          setTimeout(() => {
            setDisplayedText(part3Base + '\n2');
            setTimeout(() => {
              setDisplayedText(part3Base + '\n1');
              setTimeout(() => {
                setStage(3);
              }, 1000);
            }, 1000);
          }, 1000);
        }, 1000);
      }
    }, 30);
    return () => clearInterval(typeInterval);
  }, [stage, part3Base]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative">
      {stage === 0 && (
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="w-full flex justify-center"
            style={{ height: 4000, willChange: "transform" }}
            initial={{ y: "100vh" }}
            animate={{ y: "-100%" }}
            transition={{ duration: 60, ease: "linear" }}
          >
            <pre
              className="font-mono text-yellow-400 text-2xl md:text-3xl lg:text-4xl leading-relaxed whitespace-pre-wrap max-w-3xl"
              style={{
                textShadow: "0 0 15px rgba(251, 191, 36, 0.7)",
                transformOrigin: "bottom center",
                perspective: 1000
              }}
            >
              {part1}
            </pre>
          </motion.div>
        </div>
      )}

      {stage === 1 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-red-900/20"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-center relative z-10"
          >
            <motion.span
              animate={{
                color: showBlink ? '#ef4444' : '#dc2626',
                textShadow: showBlink
                  ? '0 0 40px rgba(239, 68, 68, 1), 0 0 80px rgba(239, 68, 68, 0.8), 0 0 120px rgba(239, 68, 68, 0.5)'
                  : '0 0 20px rgba(220, 38, 38, 0.8), 0 0 40px rgba(220, 38, 38, 0.6)'
              }}
              transition={{ duration: 0.1 }}
              style={{
                fontSize: 'clamp(3.5rem, 15vw, 7rem)',
                fontWeight: 'bold',
                display: 'inline-block',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}
            >
              {part2}
            </motion.span>
          </motion.div>
        </div>
      )}

      {stage === 2 && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-3xl"
          >
            <div className="bg-black border-2 border-green-500/30 rounded-lg shadow-2xl shadow-green-500/10 overflow-hidden relative">
              <div className="bg-stone-900 px-4 py-2 flex items-center gap-2 border-b border-green-500/20">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                <span className="text-green-400 text-xs font-bold ml-4">
                  SYSTEM TERMINAL - PRIORITY ALPHA
                </span>
              </div>
              <div ref={terminalRef} className="relative p-4 md:p-6 h-[50vh] overflow-y-auto">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)'
                  }}
                />
                <motion.pre
                  className="relative font-mono text-green-400 text-sm md:text-base lg:text-lg leading-relaxed whitespace-pre-wrap"
                  style={{ textShadow: "0 0 10px rgba(74, 222, 128, 0.5)" }}
                >
                  {displayedText}
                  <motion.span
                    className="inline-block bg-green-400 text-black"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ width: '0.7em', height: '1.1em', display: 'inline-block' }}
                  >
                    █
                  </motion.span>
                </motion.pre>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {stage === 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="w-full h-full absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
        >
          <MatrixRain />

          <motion.div
            className="relative z-20 text-center flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="relative inline-block">
              <h2 className="text-5xl md:text-7xl font-bold text-green-400 font-mono tracking-wider drop-shadow-[0_0_20px_rgba(74,222,128,0.8)]">
                AImpostor
              </h2>
              <div className="absolute inset-0 bg-red-500/20 skew-x-12 -z-10 animate-pulse" />
            </div>

            <motion.p
              className="text-sm text-stone-400 font-mono"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Appuie sur Espace pour afficher le menu
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
