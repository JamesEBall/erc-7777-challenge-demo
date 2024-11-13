// simulator/stm32_sim.js
const { spawn } = require('child_process');
const EventEmitter = require('events');
const net = require('net');

class STM32Simulator extends EventEmitter {
    constructor() {
        super();
        this.state = {
            firmware_hash: Buffer.alloc(32).fill(0), // Initial firmware hash
            security_status: {
                debug_enabled: false,
                secure_boot: true,
                flash_protected: true
            },
            bootCount: 0,
            lastCheckpoint: null
        };
        
        this.privateKey = null; // Will be initialized with device key
        this.publicKey = null;
    }

    async start() {
        // Initialize QEMU for STM32
        this.qemu = spawn('qemu-system-arm', [
            '-machine', 'stm32h503-nucleo',
            '-nographic',
            '-kernel', 'simulator/firmware.bin',
            '-serial', 'tcp::1234,server,nowait'
        ]);

        // Set up virtual UART
        this.server = net.createServer((socket) => {
            this.socket = socket;
            socket.on('data', (data) => this.handleCommand(data));
        });

        await new Promise((resolve) => this.server.listen(1234, resolve));
        console.log('STM32 simulator running on port 1234');
    }

    async handleCommand(data) {
        const command = data.toString().trim();
        
        switch(command[0]) {
            case 'C': // Challenge
                await this.handleChallenge(command.slice(1));
                break;
            case 'H': // Create Hardware Checkpoint
                await this.createCheckpoint();
                break;
            case 'M': // Modify State (for testing)
                await this.modifyState(command.slice(1));
                break;
            case 'V': // Verify State
                await this.verifyState();
                break;
        }
    }

    async handleChallenge(challenge) {
        // Simulate hardware signing
        const signature = await this.signWithSecureElement(Buffer.from(challenge, 'hex'));
        this.socket.write(signature);
    }

    async createCheckpoint() {
        const checkpoint = {
            timestamp: Date.now(),
            stateHash: this.calculateStateHash(),
            signature: await this.signWithSecureElement(this.calculateStateHash())
        };
        
        this.lastCheckpoint = checkpoint;
        this.socket.write(JSON.stringify(checkpoint));
    }

    calculateStateHash() {
        // Combine all state elements into a hash
        const state = Buffer.concat([
            this.state.firmware_hash,
            Buffer.from(JSON.stringify(this.state.security_status)),
            Buffer.from(this.state.bootCount.toString())
        ]);
        
        return crypto.createHash('sha256').update(state).digest();
    }

    async modifyState(modification) {
        // For testing different tampering scenarios
        const [type, value] = modification.split(':');
        
        switch(type) {
            case 'firmware':
                // Simulate firmware modification
                this.state.firmware_hash = crypto.randomBytes(32);
                break;
            case 'debug':
                // Simulate debug port activation
                this.state.security_status.debug_enabled = true;
                break;
            case 'boot':
                // Simulate boot configuration change
                this.state.security_status.secure_boot = false;
                break;
        }
        
        this.emit('stateChanged', type);
    }

    async verifyState() {
        if (!this.lastCheckpoint) {
            this.socket.write(JSON.stringify({ verified: false, reason: 'No checkpoint' }));
            return;
        }

        const currentHash = this.calculateStateHash();
        const verified = currentHash.equals(this.lastCheckpoint.stateHash);
        
        this.socket.write(JSON.stringify({
            verified,
            currentHash: currentHash.toString('hex'),
            checkpointHash: this.lastCheckpoint.stateHash.toString('hex')
        }));
    }

    async stop() {
        if (this.qemu) {
            this.qemu.kill();
        }
        if (this.server) {
            this.server.close();
        }
    }
}

module.exports = STM32Simulator;