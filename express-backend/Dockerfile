FROM node:20-slim
WORKDIR /app

# Runtime libraries required by node-canvas for PDF page rendering & OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 8001
CMD ["npm", "start"]
