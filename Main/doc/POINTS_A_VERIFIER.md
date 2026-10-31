# Points à vérifier avant la remise

Note de travail de l'équipe. Ce bloc vivait en tête du README ; il en a été
retiré parce que le sujet exige que la toute première ligne du README soit la
mention du cursus 42. Les points résolus sont barrés pour mémoire.

- [x] **Emplacement du README** : le sujet exige README.md à la racine du
      dépôt évalué. Résolu : le fichier est à la racine, `Main/README.MD`
      n'existe plus.
- [x] **Fichier d'exemple** : le sujet demande `.env.example`, le fichier
      versionné s'appelait `env.example`. Résolu (27e81e1) : renommé et
      références mises à jour.
- [x] **Mot de passe Postgres** : `openssl rand -base64 24` pouvait produire
      un `/` qui casse `DATABASE_URL`. Résolu : le secrets_example recommande
      `-hex` avec l'explication.
- [x] **Privacy Policy** : la page ne mentionnait pas que les messages du
      chat partent vers l'API Mistral. Résolu (80f9df8 + rebase 8138f01) :
      sections dédiées dans la Privacy Policy et les CGU.
- [ ] **Attributions** : une partie du code est arrivé par des commits
      « sync » et « import » depuis le dépôt collectif. L'auteur d'un commit
      n'est donc pas toujours celui du code — par exemple, le backend NestJS
      initial vient du squelette core/ de « mwallis ». Chaque membre doit
      relire sa section du README et corriger les attributions.
- [ ] **Champs Who du README** : plusieurs sections de modules et la section
      « Individual Contributions » ont encore des `<!-- TODO: a confirmer -->`
      sur qui a fait quoi.
- [ ] **Matrice navigateurs** : il reste des cases `TODO` pour Chrome et
      Firefox (profil, endgame, Privacy/ToS — la Privacy Policy a changé
      depuis leurs pré-tests, à re-vérifier dessus).
