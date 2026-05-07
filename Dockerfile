FROM node:20-bookworm

WORKDIR /app

# Build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Build app
RUN npm run build

# Runtime configuration
ENV DB_PATH=/railway/storage/data/grocery.db
ENV PORT=3000

EXPOSE 3000
CMD ["node", "build"]
