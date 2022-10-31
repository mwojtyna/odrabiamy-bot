FROM arm64v8/node:18.12-bullseye-slim
WORKDIR /app

# Install dependencies
RUN apt-get update
RUN apt-get install -y chromium curl

# Install packages
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
COPY package*.json .
RUN npm i

# Copy required files to /app
COPY tsconfig.json .
COPY /src ./src
RUN mkdir -p screenshots/
RUN mkdir -p ./src/config

# Check express.js endpoint
HEALTHCHECK --interval=3s --timeout=30s --start-period=10s --retries=5 \
	CMD curl --fail http://localhost:3000

# Run npm start
CMD ["npm", "start"]