# This Makefile automates routine tasks for this Singularity-based project.

start:
	docker compose up -d
	docker compose logs -f

build:
	docker compose build

stop:
	docker compose down

logs:
	docker compose logs -f
