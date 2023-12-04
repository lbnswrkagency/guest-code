FROM ghcr.io/puppeteer/puppeteer:21.5.2

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Install canvas dependencies
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# Start the application
CMD [ "node", "index.js" ]
