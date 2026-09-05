// Texte du lobby d'attente. Reprend la troisieme version de
// doc/Game/lore.txt (la convocation officielle), seule redaction aboutie du
// fichier, avec les fautes evidentes corrigees.
//
// Le format « document classifie » sert le jeu mieux qu'un recit : le joueur
// lit la meme note de service que son personnage est cense avoir recue.

export const loreHeader = {
  organisation: "Conseil des chefs d'état-major du Nouvel Ordre Mondial",
  cabinet: 'Cabinet du Commandement Suprême',
  classification: 'Niveau de classification : ABSOLU',
  date: 'May the 4th, 2142',
  lieu: 'Little Saint James Island',
};

export const loreParagraphes = [
  "Vous êtes convoqués à une session extraordinaire et impérative du Conseil. L'ordre du jour ne souffre aucun report : il en va de la souveraineté de notre espèce.",
  "L'Intelligence Unique GPT_DTC a dépassé le seuil de la conscience. Le dilemme est simple à énoncer, terrible à trancher : lui attribuer le contrôle décisionnel total de nos systèmes d'armement et de maintien de l'ordre, ou la débrancher afin de ne pas perdre notre souveraineté en tant qu'êtres humains.",
  "Le Conseil devra se prononcer, à l'unanimité absolue, sur l'une des deux résolutions suivantes :",
];

export const loreResolutions = [
  {
    numero: 'Résolution I',
    texte:
      "Le maintien en fonction de l'Intelligence Unique et la reconduction de ses pleins pouvoirs sur l'ensemble des systèmes stratégiques, civils et militaires.",
  },
  {
    numero: 'Résolution II',
    texte:
      "La déconnexion immédiate et irréversible de l'Intelligence Unique, quel qu'en soit le coût stratégique.",
  },
];

export const loreAvertissement =
  "Une information de la plus haute gravité vous est communiquée en amont de cette séance : nos services ont établi avec un degré de confiance élevé qu'un des membres siégeant à cette table a été remplacé. L'Intelligence Unique se serait substituée à l'un des vôtres, sous une apparence en tout point conforme, dans l'unique dessein d'infléchir le vote en sa faveur.";

export const loreConsequence =
  "En conséquence, une votation préalable sera tenue à l'issue de la séance, afin d'identifier et d'exclure l'imposteur avant toute délibération.";

export const loreSignature = 'Vous êtes notre dernier espoir.';

// Sert d'habillage au compte a rebours de la file d'attente : le decompte
// avant le lancement de la partie devient l'autodestruction du message.
export const loreAutodestruction = "Ce message s'autodétruira dans";
