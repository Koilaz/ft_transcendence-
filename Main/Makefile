COMPOSE = docker compose

-include .env
export

all: up

# Construire les images puis lancer les containers.
up: ollama-pull
	$(COMPOSE) up --build

# Arrêter et supprimer les containers.
down:
	$(COMPOSE) down

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
clean:
	$(COMPOSE) down -v

# Supprimer les poids du modele (garde-fou sur le chemin).
ollama-clean:
	@if [ -n "$(OLLAMA_DATA_DIR)" ] && [ -d "$(OLLAMA_DATA_DIR)/models" ]; then \
		echo "Suppression de $(OLLAMA_DATA_DIR)/models"; \
		rm -rf "$(OLLAMA_DATA_DIR)/models"; \
	fi

# Nettoyage complet de Docker.
fclean:
	docker system prune -af

ffclean:
	fclean
	ollama-clean

# Reconstruction complète du projet.
re: fclean up

.PHONY: all up down start stop restart ollama-pull ollama-list logs ps clean ollama-clean fclean ffclean re
