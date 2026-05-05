# ---- Build stage ----
FROM rust:slim-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire project
COPY . .

# Build the Rust backend in release mode
WORKDIR /app/src-tauri
RUN cargo build --release

# ---- Production stage ----
FROM debian:bookworm-slim
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from the build stage
COPY --from=builder /app/src-tauri/target/release/acidmonitorr ./acidmonitorr

# Copy the frontend (HTML/JS/CSS)
COPY src/ src/

# Create data directory (to be mounted by user)
RUN mkdir -p /app/data

# Expose the web server port
EXPOSE 3000

# Environment variables for server mode
ENV ACID_SERVER=1
ENV ACID_CONFIG_DIR=/app/data

# Run the application in server mode
CMD ["./acidmonitorr", "--server"]
