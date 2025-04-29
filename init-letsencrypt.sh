#!/bin/bash

domains=(mathematiguy.ddns.net)
email="calebjdmoses@gmail.com" # Replace with your email
staging=1 # Set to 0 for production certificates (1 for testing)

# Create required directories
mkdir -p ./certbot/conf/live/mathematiguy.ddns.net
mkdir -p ./certbot/www

echo "### Starting nginx..."
docker compose -f docker-compose.prod.yml up -d emd-calculator-prod

echo "### Obtaining certificates..."
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
       --webroot -w /var/www/certbot \
       --email $email \
       --agree-tos --no-eff-email \
       --staging=$staging \
       -d mathematiguy.ddns.net

echo "### Restarting nginx..."
docker compose -f docker-compose.prod.yml restart emd-calculator-prod
