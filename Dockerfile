# Use Node.js LTS as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install necessary tools
RUN apk add --no-cache git

# Environment variables
ENV PATH /app/node_modules/.bin:$PATH
ENV NODE_ENV development

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . ./

# Expose development server port
EXPOSE 3000

# Command to run on container start
CMD ["npm", "start"]
