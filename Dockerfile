# Only this specific version will work with pupeteer 15.4.2 on arm64v8
FROM arm64v8/node:16.17.0-bullseye-slim
WORKDIR /app

# Install chromium dependencies
RUN apt-get update
RUN apt-get install -y chromium

# Install packages
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package*.json .
RUN npm i

# Copy all files to container (except files in .dockerignore)
COPY . .

# Run npm start
CMD [ "npm", "start" ]