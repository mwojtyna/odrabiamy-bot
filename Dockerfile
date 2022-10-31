# To prevent cache invalidation from changes in fields other than dependencies and scripts
# https://stackoverflow.com/a/58487433
FROM endeveit/docker-jq AS deps

COPY package.json /tmp
RUN jq '{ scripts, dependencies, devDependencies }' < /tmp/package.json > /tmp/deps.json

# Actual image
FROM arm64v8/node:18.12-bullseye-slim
WORKDIR /app

# Install dependencies
RUN apt-get update
RUN apt-get install -y chromium curl

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Get version from outside since we can't get it from package.json
ARG VERSION=0.0.0
ENV npm_package_version=$VERSION

# Install packages
COPY --from=deps /tmp/deps.json ./package.json
COPY package-lock.json ./
RUN npm i

# Copy required files to /app
COPY tsconfig.json ./
COPY /src ./src
RUN mkdir -p screenshots/
RUN mkdir -p ./src/config

# Check express.js endpoint
HEALTHCHECK --interval=3s --timeout=30s --start-period=10s --retries=5 \
	CMD curl --fail http://localhost:3000

# Run npm start
CMD ["npm", "start"]