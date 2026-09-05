# Git — workflow d'equipe

Etat au 5 septembre 2026. Conventions de travail sur le depot : comment on
organise les branches, comment on livre une feature, et les regles a ne pas
enfreindre.

A lire avant le premier commit. Pour lancer la stack, voir
[README_TMP.md](README_TMP.md).

---

## 1. Pourquoi on ne travaille pas directement sur `main`

Deux raisons, et la premiere n'est pas celle qu'on croit.

**`main` doit toujours etre dans un etat qui marche.** Ce n'est pas une zone de
depot qui devient serieuse une fois le projet fini : c'est la branche ou
« ca compile et ca tourne » est garanti, du premier au dernier jour. Des que
deux personnes poussent du travail a moitie fait sur `main`, plus personne ne
sait si un bug vient de soi ou du voisin, et `git pull` devient une loterie.

**L'isolation.** Si deux personnes travaillent sur `main` en meme temps, chaque
`git pull` essaie de reconcilier deux features inachevees. Sur des branches
separees, chacun casse ce qu'il veut chez lui, et on ne reconcilie qu'une seule
fois, au moment choisi : le merge.

---

## 2. Structure des branches

```
main   <- uniquement du code stable, defendable en eval aujourd'hui
 |
 +-- dev   <- integration : les features arrivent ici d'abord, on teste ensemble
      |
      +-- feat/auth-oauth       (eliott)
      +-- feat/vote-system      (chouaib)
      +-- fix/docker-ollama     (mathys)
```

| Branche | Qui y pousse | Contenu |
|---|---|---|
| `main` | personne directement (PR only) | versions stables |
| `dev` | personne directement (PR only) | integration des features |
| `feat/*`, `fix/*` | son auteur | travail en cours |

`dev` est la branche par defaut du depot : les PR la ciblent automatiquement.

---

## 3. Cycle de vie d'une feature

### 3.1 Demarrer

Toujours partir d'un `dev` a jour, jamais de l'etat local qu'on avait la veille.

```bash
git switch dev
git pull                        # recupere le travail des autres
git switch -c feat/mon-truc     # -c = create
```

### 3.2 Travailler

Commits petits et frequents. Un commit = un changement coherent, descriptible
en une ligne.

```bash
git status                      # TOUJOURS regarder avant d'ajouter
git add Main/requirements/frontend/app/src/pages/VoteSystem.tsx
git commit -m "feat(vote): affiche les resultats en temps reel"
```

### 3.3 Se synchroniser avant de livrer

On ramene `dev` dans sa branche pour resoudre les conflits chez soi, plutot que
de les refiler a celui qui relit.

```bash
git switch dev && git pull
git switch feat/mon-truc
git merge dev                   # les conflits se resolvent ici
git push -u origin feat/mon-truc
```

### 3.4 Ouvrir une Pull Request

Sur GitHub, `feat/mon-truc` -> `dev`. Meme a quatre dans la meme salle, la PR
sert a trois choses : un diff que quelqu'un lit vraiment, un endroit pour
discuter, et une trace. On demande une relecture a un coequipier.

Une fois la PR mergee, supprimer la branche (bouton sur GitHub).

### 3.5 Livrer sur `main`

Quand `dev` est stable et teste, PR `dev` -> `main`. C'est la release.

---

## 4. Conventions de nommage

### 4.1 Branches

`type/description-courte`, en anglais ou en francais mais sans accents.

| Prefixe | Usage |
|---|---|
| `feat/` | nouvelle fonctionnalite |
| `fix/` | correction de bug |
| `refactor/` | reorganisation sans changement de comportement |
| `docs/` | documentation |

Bon : `feat/vote-system`, `fix/docker-ollama`.

Mauvais : `chouaib`, `test`, `fetch`. Un nom de personne ne dit pas ce qu'il y a
dedans, et la branche suivante de la meme personne n'a nulle part ou aller.

### 4.2 Commits

`type(scope): description a l'infinitif ou au present`

```
feat(vote): ajoute la phase de vote en fin de round
fix(game): corrige la deconnexion des joueurs en spectateur
docs(backend): documente les routes d'authentification
chore(ci): met a jour l'image docker de node
```

---

## 5. Regles d'or

### 5.1 Ne jamais faire `git add .`

C'est la cause la plus frequente de fuite de secrets. `git add .` ramasse tout
ce qui n'est pas ignore, y compris des fichiers qu'on n'a jamais voulu
partager.

On ajoute les fichiers un par un, apres avoir lu `git status`. Pour relire ses
modifications morceau par morceau avant de committer :

```bash
git add -p
```

### 5.2 Ne jamais supprimer le `.gitignore`

Le `.gitignore` a la racine protege `.env`, `secrets/`, `ollama_data/` et les
cles privees. Le supprimer ne fait pas que desactiver l'ignorance pour la
suite : il rend d'un coup visibles tous les fichiers caches jusque-la, qu'un
`git add .` va aussitot embarquer.

C'est exactement ce qui est arrive le 5 septembre 2026 (commit `64fbfa0`) :
`.gitignore` supprime, puis `.env`, la cle API Mistral et une cle privee SSH
committes et pousses sur un depot public.

### 5.3 Un secret pousse est un secret brule

Si un identifiant part sur le remote, il faut le revoquer et le regenerer,
point. On peut nettoyer l'historique, on ne peut pas prouver que personne ne
l'a recupere entre-temps. Sur un depot public, des robots scannent les cles API
en continu.

Le depot suit `secrets_example/` et `.env.example` (des modeles vides). Les
vraies valeurs vivent dans `secrets/` et `.env`, qui sont ignores.

```bash
cp .env.example .env            # puis remplir
```

Pour generer une vraie valeur aleatoire :

```bash
openssl rand -hex 32
```

### 5.4 Retirer un fichier du suivi sans le supprimer

Si un fichier a ete committe par erreur :

```bash
git rm --cached Main/.env       # --cached = retire de git, garde sur le disque
```

Sans `--cached`, le fichier est supprime du disque et le projet ne demarre plus.

---

## 6. Resoudre un conflit

Un conflit arrive quand deux personnes ont modifie les memes lignes. Git
s'arrete et marque le fichier :

```
<<<<<<< HEAD
    const score = 10;
=======
    const score = 15;
>>>>>>> dev
```

On ouvre le fichier, on garde la version correcte (souvent une combinaison des
deux), on supprime les trois marqueurs, puis :

```bash
git add le/fichier/en/conflit.ts
git commit                      # message de merge pre-rempli
```

Pour tout annuler et revenir avant le merge :

```bash
git merge --abort
```

---

## 7. Configuration GitHub du depot

A verifier dans **Settings** :

| Reglage | Ou | Pourquoi |
|---|---|---|
| Branche par defaut = `dev` | General -> Default branch | les PR ciblent `dev` sans y penser |
| Protection de `main` | Branches -> Add rule : require PR + 1 approval | rend le push direct impossible, pas juste decourage |
| Secret scanning | Security | detecte les cles committees |
| Push protection | Security | bloque le push qui contient une cle |

Le secret scanning et la push protection sont gratuits sur un depot public.
La push protection aurait bloque l'incident du 5 septembre a la source.

---

## 8. Memo

| Besoin | Commande |
|---|---|
| Voir ou j'en suis | `git status` |
| Voir l'historique en graphe | `git log --oneline --graph --all --decorate` |
| Changer de branche | `git switch <branche>` |
| Creer une branche | `git switch -c feat/truc` |
| Lister les branches locales | `git branch -vv` |
| Recuperer les branches distantes | `git fetch origin --prune` |
| Annuler mes modifs non commitees sur un fichier | `git restore <fichier>` |
| Retirer un fichier du staging | `git restore --staged <fichier>` |
| Mettre mon travail de cote | `git stash` puis `git stash pop` |
| Corriger le dernier message de commit | `git commit --amend` |
| Voir ce qui est ignore | `git check-ignore -v <fichier>` |

### Filet de securite

Presque rien n'est definitivement perdu avec git. Si une manipulation tourne
mal :

```bash
git reflog                      # historique de tous les deplacements de HEAD
git switch -c sauvegarde <sha>  # recree une branche sur un etat perdu
```

Deux exceptions ou l'on perd vraiment : `git push --force` (a eviter sur une
branche partagee) et les modifications jamais commitees.
