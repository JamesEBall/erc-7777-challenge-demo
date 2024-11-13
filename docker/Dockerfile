# docker/Dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    python3 \
    python3-pip \
    qemu-system-arm \
    gcc-arm-none-eabi \
    cmake \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

# Install STM32CubeMX firmware
WORKDIR /opt
RUN git clone --depth 1 https://github.com/STMicroelectronics/STM32CubeH5.git

# Copy project files
WORKDIR /app
COPY . .

# Build environment ready message
CMD ["echo", "STM32 simulation environment ready"]