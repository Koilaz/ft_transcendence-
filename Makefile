-include .env
export

# Filet de securite : si .env est absent (il est gitignore, donc un clone frais
# n'en a pas), on retombe sur le meme nom de projet plutot que sur le nom du
# dossier courant. ?= laisse gagner la valeur du .env quand il existe.
COMPOSE_PROJECT_NAME ?= ft_transcendence

# -p explicite : le nom du projet ne depend plus ni du dossier depuis lequel on
# lance make, ni d'un COMPOSE_PROJECT_NAME qui trainerait dans le shell. Sans
# ca, Main_local et Main_local_ts_docker sont deux projets differents avec
# chacun leur copie des volumes.
COMPOSE = docker compose -p $(COMPOSE_PROJECT_NAME)

all: up

# Construire les images puis lancer les containers.
up:
	$(COMPOSE) up --build

# Arrêter et supprimer les containers.
# --remove-orphans : supprime aussi les containers du projet qui ne sont plus
# declares dans le compose file (service renomme ou retire). Sans ca ils
# survivent au down et bloquent le up suivant sur un conflit de nom.
down:
	$(COMPOSE) down --remove-orphans

# Démarrer les containers existants.
start:
	$(COMPOSE) start

# Arrêter les containers.
stop:
	$(COMPOSE) stop

# Redémarrer les containers.
restart:
	$(COMPOSE) restart

# Télécharger le modèle.
ollama-pull:
	@$(COMPOSE) up -d ollama
	@until $(COMPOSE) exec -T ollama ollama list >/dev/null 2>&1; do sleep 1; done
	@if $(COMPOSE) exec -T ollama ollama list | grep -q '$(OLLAMA_MODEL)'; then \
		echo "Modele $(OLLAMA_MODEL) deja present."; \
	else \
		$(COMPOSE) exec -T ollama ollama pull $(OLLAMA_MODEL); \
	fi

# Lister les modèles présents.
ollama-list:
	@$(COMPOSE) exec -T ollama ollama list

# Afficher les logs.
logs:
	$(COMPOSE) logs

# Afficher les containers.
ps:
	$(COMPOSE) ps

# Arrêter les containers et supprimer les volumes.
# C'est ce down-la qui tourne dans re (re -> fclean -> clean).
clean:
	$(COMPOSE) down -v --remove-orphans

# Supprimer les poids du modele (garde-fou sur le chemin).
ollama-clean:
	@if [ -n "$(OLLAMA_DATA_DIR)" ] && [ -d "$(OLLAMA_DATA_DIR)/models" ]; then \
		echo "Suppression de $(OLLAMA_DATA_DIR)/models"; \
		rm -rf "$(OLLAMA_DATA_DIR)/models"; \
	fi

# Nettoyage complet de Docker.
fclean: clean
	docker system prune -af

ffclean: fclean ollama-clean

# Reconstruction complète du projet.
re: fclean up

.PHONY: all up down start stop restart game-re game-logs ollama-pull ollama-list logs ps clean ollama-clean fclean ffclean re
