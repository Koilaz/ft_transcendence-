COMPOSE = docker compose



all: up



# Construire les images puis lancer les containers.
up:
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



# Afficher les logs.
logs:
	$(COMPOSE) logs

# Afficher les containers.
ps:
	$(COMPOSE) ps



# Arrêter les containers et supprimer les volumes.
clean:
	$(COMPOSE) down -v

# Nettoyage complet de Docker.
fclean: clean
	docker system prune -af



# Reconstruction complète du projet.
re: fclean up



.PHONY: all up down start stop restart logs ps clean fclean re
