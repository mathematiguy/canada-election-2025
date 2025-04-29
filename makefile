# This Makefile automates routine tasks for this project

# Development commands
start:
	docker compose up -d
	docker compose logs -f

build:
	docker compose build

build-app:
	docker compose run --rm emd-calculator npm run build

stop:
	docker compose down

logs:
	docker compose logs -f

# Production deployment commands
prod-build:
	docker build -t emd-calculator-builder -f Dockerfile.build .
	docker create --name temp-builder emd-calculator-builder
	docker cp temp-builder:/app/build ./build
	docker rm temp-builder
	@echo "Build files extracted to ./build directory"

prod-deploy: prod-build
	docker compose -f docker-compose.prod.yml up -d --build
	@echo "Production app is now running at http://mathematiguy.ddns.net:3000"

# Take down the production environment
prod-stop:
	docker compose -f docker-compose.prod.yml down
	@echo "Production service has been stopped"

# Show production logs and status
prod-logs:
	@echo "Container status:"
	docker compose -f docker-compose.prod.yml ps
	@echo "\nContainer logs:"
	docker compose -f docker-compose.prod.yml logs emd-calculator-prod --tail=50

# Get SSL certificates
prod-ssl-init:
	./init-letsencrypt.sh

# Enable HTTPS after certificates are obtained
prod-ssl-enable:
	cp nginx-ssl.conf nginx.conf
	docker compose -f docker-compose.prod.yml restart emd-calculator
	@echo "HTTPS enabled - your site is now available at https://mathematiguy.ddns.net:3443"

# Cleanup temporary build files
clean:
	rm -rf build
