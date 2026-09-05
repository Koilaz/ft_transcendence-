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

// Les agents de game/config.js n'ont pas passe le healthcheck : la partie se
// tiendra sans imposteur. Le joueur doit l'apprendre avant d'attendre pour
// rien, mais dans la meme fiction que le reste du lobby — un mot du service
// technique agrafe a la convocation, pas un message d'erreur. Le ton tranche
// volontairement avec la solennite de la note : c'est le gars d'en bas qui
// ecrit, pas le Cabinet.

export const loreAgentsDownTitre = 'Note du service technique';

export const loreAgentsDownIntro =
  "Bon, autant vous le dire tout de suite : l'imposteur ne viendra pas s'asseoir à la table.";

// Un texte par `reason` renvoye par le healthcheck du serveur
// (voir agents/mistral_common.js).
export const loreAgentsDownMotifs: Record<string, string> = {
  no_allowance:
    "GPT_DTC a bien son badge, mais pas un gramme de budget de calcul dessus. Elle attend que la comptabilité du Conseil daigne activer l'enveloppe.",
  rate_limited:
    "GPT_DTC a cramé son quota de calcul. Elle boude, mais ça devrait repasser tout seul d'ici peu.",
  model_unavailable:
    "Le modèle qu'on a convoqué n'est pas habilité sur ce badge. Allez savoir qui a rempli le formulaire.",
  forbidden:
    "Les codes d'accès ont été refusés. Soit ils ont expiré, soit quelqu'un est parti avec.",
  no_key:
    "Personne n'a pensé à emmener les codes d'accès. On a cherché partout, même dans le tiroir du Commandement.",
  timeout:
    "GPT_DTC met trop de temps à répondre. Elle réfléchit, ou elle fait très bien semblant.",
  unreachable:
    "GPT_DTC ne décroche pas. Le câble a encore dû être rongé par quelque chose.",
  http_error:
    "GPT_DTC répond n'importe quoi. On a rouvert un ticket, comme les six derniers.",
  unknown_agent:
    "On a convoqué une IA qui ne figure nulle part au registre. Erreur de paperasse, ça arrive.",
};

export const loreAgentsDownDefaut =
  "GPT_DTC ne répond pas, et personne ici ne sait vraiment pourquoi.";

export const loreAgentsDownPied =
  "La séance peut se tenir quand même, mais il n'y aura personne à démasquer.";
