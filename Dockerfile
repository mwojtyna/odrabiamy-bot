# Only this specific version will work with pupeteer 15.4.2 on arm64v8
FROM arm64v8/node:16.17.0-bullseye-slim
WORKDIR /app

# Install dependencies
RUN apt-get update
RUN apt-get install -y chromium curl

# Install packages
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY package*.json .
RUN npm i

# Copy required files to /app
COPY tsconfig.json .
COPY /src ./src

# Check express.js endpoint
HEALTHCHECK --interval=3s --timeout=30s --start-period=10s --retries=5 \
	CMD curl --fail http://localhost:3000

# Run npm start
CMD ["npm", "start"]