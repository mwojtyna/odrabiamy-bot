# Only this specific version will work with pupeteer 15.4.2
FROM arm64v8/node:16.17.0-bullseye-slim
WORKDIR /app

# Install chromium dependencies
RUN apt update
RUN apt install -y chromium

# Install packages
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY package*.json .
RUN npm i

# Copy all files to container (except files in .dockerignore)
COPY . .

# Run npm start
CMD [ "npm", "start" ]