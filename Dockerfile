FROM node:20-alpine

WORKDIR /app

# Install build tools for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Build the SvelteKit app
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p data

# Railway expects the app on port 3000
EXPOSE 3000

# Start the preview server
CMD ["npm", "run", "preview"]
