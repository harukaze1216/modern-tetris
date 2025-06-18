class ModernTetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.COLS = 10;
        this.ROWS = 20;
        this.BLOCK_SIZE = 30;
        
        this.board = this.createBoard();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;
        this.isPaused = false;
        this.isGameOver = false;
        
        // Animation and effect systems
        this.particles = [];
        this.blockAnimations = [];
        this.effectTypes = ['explode', 'melt', 'bounce', 'sparkle', 'implode'];
        
        this.colors = [
            null,
            '#FF6B6B', // I-piece - 赤
            '#4ECDC4', // O-piece - ターコイズ
            '#45B7D1', // T-piece - 青
            '#96CEB4', // S-piece - 緑
            '#FFEAA7', // Z-piece - 黄
            '#DDA0DD', // J-piece - 紫
            '#FFA07A'  // L-piece - オレンジ
        ];
        
        this.pieces = [
            [
                [0,0,0,0],
                [1,1,1,1],
                [0,0,0,0],
                [0,0,0,0],
            ],
            [
                [2,2],
                [2,2],
            ],
            [
                [0,3,0],
                [3,3,3],
                [0,0,0],
            ],
            [
                [0,4,4],
                [4,4,0],
                [0,0,0],
            ],
            [
                [5,5,0],
                [0,5,5],
                [0,0,0],
            ],
            [
                [6,0,0],
                [6,6,6],
                [0,0,0],
            ],
            [
                [0,0,7],
                [7,7,7],
                [0,0,0],
            ]
        ];
        
        this.currentPiece = null;
        this.nextPiece = null;
        this.generateNewPiece();
        this.generateNewPiece();
        
        this.initEventListeners();
        this.updateDisplay();
        this.gameLoop();
    }
    
    createBoard() {
        return Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0));
    }
    
    generateNewPiece() {
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
        } else {
            const typeId = Math.floor(Math.random() * this.pieces.length);
            this.currentPiece = {
                matrix: this.pieces[typeId],
                pos: { x: Math.floor(this.COLS / 2) - Math.floor(this.pieces[typeId][0].length / 2), y: 0 }
            };
        }
        
        const nextTypeId = Math.floor(Math.random() * this.pieces.length);
        this.nextPiece = {
            matrix: this.pieces[nextTypeId],
            pos: { x: Math.floor(this.COLS / 2) - Math.floor(this.pieces[nextTypeId][0].length / 2), y: 0 }
        };
        
        if (this.collides(this.currentPiece.matrix, this.currentPiece.pos)) {
            this.gameOver();
        }
    }
    
    collides(matrix, pos) {
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0) {
                    const newX = pos.x + x;
                    const newY = pos.y + y;
                    
                    if (newX < 0 || newX >= this.COLS || newY >= this.ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && this.board[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    merge() {
        const pieceBlocks = [];
        
        this.currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = y + this.currentPiece.pos.y;
                    const boardX = x + this.currentPiece.pos.x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = value;
                        pieceBlocks.push({ x: boardX, y: boardY, color: value });
                    }
                }
            });
        });
        
        // Trigger random effect for each block
        this.triggerRandomBlockEffect(pieceBlocks);
        
        // Check for line clears after effects are applied
        setTimeout(() => {
            this.clearLines();
        }, 100);
    }
    
    rotate(matrix) {
        const rotated = matrix[0].map((_, index) =>
            matrix.map(row => row[index]).reverse()
        );
        return rotated;
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.COLS).fill(0));
                linesCleared++;
                y++; // Check the same row again
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += linesCleared * 100 * this.level;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 50);
        }
    }
    
    drop() {
        this.currentPiece.pos.y++;
        if (this.collides(this.currentPiece.matrix, this.currentPiece.pos)) {
            this.currentPiece.pos.y--;
            this.merge();
            this.generateNewPiece();
        }
    }
    
    move(dir) {
        this.currentPiece.pos.x += dir;
        if (this.collides(this.currentPiece.matrix, this.currentPiece.pos)) {
            this.currentPiece.pos.x -= dir;
        }
    }
    
    rotateCurrentPiece() {
        const rotated = this.rotate(this.currentPiece.matrix);
        if (!this.collides(rotated, this.currentPiece.pos)) {
            this.currentPiece.matrix = rotated;
        }
    }
    
    hardDrop() {
        while (!this.collides(this.currentPiece.matrix, { x: this.currentPiece.pos.x, y: this.currentPiece.pos.y + 1 })) {
            this.currentPiece.pos.y++;
        }
        this.drop();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw board
        this.drawMatrix(this.board, { x: 0, y: 0 });
        
        // Draw current piece
        if (this.currentPiece) {
            this.drawMatrix(this.currentPiece.matrix, this.currentPiece.pos);
        }
        
        // Draw next piece
        this.drawNextPiece();
        
        // Draw particles and animations
        this.drawParticles();
        this.drawBlockAnimations();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
    }
    
    drawMatrix(matrix, offset) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const posX = (x + offset.x) * this.BLOCK_SIZE;
                    const posY = (y + offset.y) * this.BLOCK_SIZE;
                    
                    // Draw block with gradient
                    const gradient = this.ctx.createLinearGradient(posX, posY, posX + this.BLOCK_SIZE, posY + this.BLOCK_SIZE);
                    gradient.addColorStop(0, this.colors[value]);
                    gradient.addColorStop(1, this.darkenColor(this.colors[value], 0.3));
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(posX, posY, this.BLOCK_SIZE, this.BLOCK_SIZE);
                    
                    // Draw border
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(posX, posY, this.BLOCK_SIZE, this.BLOCK_SIZE);
                }
            });
        });
    }
    
    drawNextPiece() {
        this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const blockSize = 20;
            const offsetX = (this.nextCanvas.width - this.nextPiece.matrix[0].length * blockSize) / 2;
            const offsetY = (this.nextCanvas.height - this.nextPiece.matrix.length * blockSize) / 2;
            
            this.nextPiece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const posX = offsetX + x * blockSize;
                        const posY = offsetY + y * blockSize;
                        
                        this.nextCtx.fillStyle = this.colors[value];
                        this.nextCtx.fillRect(posX, posY, blockSize, blockSize);
                        
                        this.nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        this.nextCtx.lineWidth = 1;
                        this.nextCtx.strokeRect(posX, posY, blockSize, blockSize);
                    }
                });
            });
        }
    }
    
    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`;
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    gameLoop(time = 0) {
        if (!this.isPaused && !this.isGameOver) {
            const deltaTime = time - this.lastTime;
            this.lastTime = time;
            
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) {
                this.drop();
                this.dropCounter = 0;
            }
            
            // Update animations and particles
            this.updateParticles(deltaTime);
            this.updateBlockAnimations(deltaTime);
            
            this.draw();
            this.updateDisplay();
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameOver() {
        this.isGameOver = true;
        alert(`Game Over! Final Score: ${this.score}`);
    }
    
    pause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';
    }
    
    restart() {
        this.board = this.createBoard();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.isPaused = false;
        this.isGameOver = false;
        this.particles = [];
        this.blockAnimations = [];
        this.generateNewPiece();
        this.generateNewPiece();
        document.getElementById('pauseBtn').textContent = 'Pause';
    }
    
    initEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.isPaused || this.isGameOver) return;
            
            switch (e.code) {
                case 'ArrowLeft':
                    this.move(-1);
                    break;
                case 'ArrowRight':
                    this.move(1);
                    break;
                case 'ArrowDown':
                    this.drop();
                    this.dropCounter = 0;
                    break;
                case 'ArrowUp':
                    this.rotateCurrentPiece();
                    break;
                case 'Space':
                    e.preventDefault();
                    this.hardDrop();
                    break;
            }
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pause();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
    }
    
    // ============ ANIMATION EFFECTS SYSTEM ============
    
    triggerRandomBlockEffect(blocks) {
        blocks.forEach(block => {
            const effectType = this.effectTypes[Math.floor(Math.random() * this.effectTypes.length)];
            this.createBlockEffect(block, effectType);
        });
    }
    
    createBlockEffect(block, effectType) {
        const centerX = (block.x + 0.5) * this.BLOCK_SIZE;
        const centerY = (block.y + 0.5) * this.BLOCK_SIZE;
        const color = this.colors[block.color];
        
        switch (effectType) {
            case 'explode':
                this.createExplodeEffect(centerX, centerY, color);
                this.applyExplodeEffect(block.x, block.y);
                break;
            case 'melt':
                this.createMeltEffect(block.x, block.y, color);
                this.applyMeltEffect(block.x, block.y, block.color);
                break;
            case 'bounce':
                this.createBounceEffect(block.x, block.y, color);
                this.applyBounceEffect(block.x, block.y, block.color);
                break;
            case 'sparkle':
                this.createSparkleEffect(centerX, centerY, color);
                break;
            case 'implode':
                this.createImplodeEffect(centerX, centerY, color);
                this.applyImplodeEffect(block.x, block.y);
                break;
        }
    }
    
    createExplodeEffect(centerX, centerY, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: color,
                life: 1.0,
                decay: 0.02,
                type: 'explode'
            });
        }
    }
    
    createMeltEffect(blockX, blockY, color) {
        this.blockAnimations.push({
            x: blockX,
            y: blockY,
            color: color,
            type: 'melt',
            progress: 0,
            duration: 800,
            originalHeight: this.BLOCK_SIZE
        });
    }
    
    createBounceEffect(blockX, blockY, color) {
        this.blockAnimations.push({
            x: blockX,
            y: blockY,
            color: color,
            type: 'bounce',
            progress: 0,
            duration: 600,
            bounceHeight: 0
        });
    }
    
    createSparkleEffect(centerX, centerY, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * this.BLOCK_SIZE,
                y: centerY + (Math.random() - 0.5) * this.BLOCK_SIZE,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: 2 + Math.random() * 3,
                color: '#FFFFFF',
                life: 1.0,
                decay: 0.015,
                type: 'sparkle'
            });
        }
    }
    
    createImplodeEffect(centerX, centerY, color) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            this.particles.push({
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                targetX: centerX,
                targetY: centerY,
                size: 2 + Math.random() * 3,
                color: color,
                life: 1.0,
                decay: 0.025,
                type: 'implode'
            });
        }
    }
    
    updateParticles(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.life -= particle.decay;
            
            if (particle.type === 'implode') {
                // Move towards target
                const dx = particle.targetX - particle.x;
                const dy = particle.targetY - particle.y;
                particle.x += dx * 0.1;
                particle.y += dy * 0.1;
            } else {
                // Normal movement
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                if (particle.type === 'explode') {
                    particle.vy += 0.1; // Gravity
                }
            }
            
            return particle.life > 0;
        });
    }
    
    updateBlockAnimations(deltaTime) {
        this.blockAnimations = this.blockAnimations.filter(anim => {
            anim.progress += deltaTime;
            
            if (anim.type === 'bounce') {
                const t = anim.progress / anim.duration;
                if (t <= 1) {
                    anim.bounceHeight = Math.sin(t * Math.PI * 3) * 10 * (1 - t);
                }
            }
            
            return anim.progress < anim.duration;
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            
            if (particle.type === 'sparkle') {
                // Draw sparkle as a star
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add glow effect
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = particle.color;
                this.ctx.fill();
            } else {
                // Draw regular particle
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    drawBlockAnimations() {
        this.blockAnimations.forEach(anim => {
            const posX = anim.x * this.BLOCK_SIZE;
            const posY = anim.y * this.BLOCK_SIZE;
            
            this.ctx.save();
            
            if (anim.type === 'melt') {
                const t = anim.progress / anim.duration;
                const meltProgress = Math.min(t * 1.5, 1);
                
                // Draw melting effect
                const currentHeight = anim.originalHeight * (1 - meltProgress * 0.7);
                const meltOffset = meltProgress * 15;
                
                // Create melting gradient
                const gradient = this.ctx.createLinearGradient(posX, posY, posX, posY + this.BLOCK_SIZE + meltOffset);
                gradient.addColorStop(0, anim.color);
                gradient.addColorStop(0.7, anim.color);
                gradient.addColorStop(1, this.darkenColor(anim.color, 0.5));
                
                this.ctx.fillStyle = gradient;
                this.ctx.globalAlpha = 1 - t;
                
                // Draw melting block
                this.ctx.beginPath();
                this.ctx.moveTo(posX, posY + this.BLOCK_SIZE - currentHeight);
                this.ctx.lineTo(posX + this.BLOCK_SIZE, posY + this.BLOCK_SIZE - currentHeight);
                this.ctx.lineTo(posX + this.BLOCK_SIZE - meltOffset/2, posY + this.BLOCK_SIZE + meltOffset);
                this.ctx.lineTo(posX + meltOffset/2, posY + this.BLOCK_SIZE + meltOffset);
                this.ctx.closePath();
                this.ctx.fill();
                
            } else if (anim.type === 'bounce') {
                const t = anim.progress / anim.duration;
                
                // Draw bouncing block
                this.ctx.globalAlpha = 1 - t;
                this.ctx.fillStyle = anim.color;
                this.ctx.fillRect(posX, posY - anim.bounceHeight, this.BLOCK_SIZE, this.BLOCK_SIZE);
                
                // Draw shadow
                this.ctx.globalAlpha = (1 - t) * 0.3;
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                const shadowScale = 1 + anim.bounceHeight / 20;
                this.ctx.ellipse(
                    posX + this.BLOCK_SIZE/2, posY + this.BLOCK_SIZE + 5,
                    this.BLOCK_SIZE/2 * shadowScale, 5,
                    0, 0, Math.PI * 2
                );
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    // ============ FUNCTIONAL EFFECTS ============
    
    applyExplodeEffect(x, y) {
        // Remove blocks in a 3x3 area around the explosion
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const newX = x + dx;
                const newY = y + dy;
                
                if (newX >= 0 && newX < this.COLS && newY >= 0 && newY < this.ROWS) {
                    if (this.board[newY][newX] !== 0) {
                        // Create explosion particles for destroyed blocks
                        const blockCenterX = (newX + 0.5) * this.BLOCK_SIZE;
                        const blockCenterY = (newY + 0.5) * this.BLOCK_SIZE;
                        this.createMiniExplosion(blockCenterX, blockCenterY, this.colors[this.board[newY][newX]]);
                        
                        this.board[newY][newX] = 0;
                        this.score += 10; // Bonus points for destroyed blocks
                    }
                }
            }
        }
    }
    
    applyMeltEffect(x, y, color) {
        // Remove the original block
        this.board[y][x] = 0;
        
        // Find the lowest possible position for the melted block
        let meltY = y;
        while (meltY + 1 < this.ROWS && this.board[meltY + 1][x] === 0) {
            meltY++;
        }
        
        // Place the melted block at the bottom
        if (meltY !== y) {
            this.board[meltY][x] = color;
            
            // Create melting trail effect
            setTimeout(() => {
                for (let trailY = y + 1; trailY < meltY; trailY++) {
                    this.particles.push({
                        x: (x + 0.5) * this.BLOCK_SIZE,
                        y: (trailY + 0.5) * this.BLOCK_SIZE,
                        vx: 0,
                        vy: 1,
                        size: 2,
                        color: this.colors[color],
                        life: 0.5,
                        decay: 0.01,
                        type: 'melt_trail'
                    });
                }
            }, 200);
        }
    }
    
    applyBounceEffect(x, y, color) {
        // Remove the original block
        this.board[y][x] = 0;
        
        // Find a random nearby position to bounce to
        const bounceDirections = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
            { dx: 0, dy: -1 }
        ];
        
        const validMoves = bounceDirections.filter(dir => {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            return newX >= 0 && newX < this.COLS && newY >= 0 && newY < this.ROWS && this.board[newY][newX] === 0;
        });
        
        if (validMoves.length > 0) {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            const newX = x + randomMove.dx;
            const newY = y + randomMove.dy;
            
            // Place the bounced block after animation
            setTimeout(() => {
                this.board[newY][newX] = color;
            }, 300);
        } else {
            // If no valid moves, just remove the block
            this.score += 5; // Small bonus for removed block
        }
    }
    
    applyImplodeEffect(x, y) {
        // Remove blocks in a cross pattern
        const crossPattern = [
            { dx: 0, dy: 0 }, // Center
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, // Left, Right
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }  // Up, Down
        ];
        
        crossPattern.forEach(pos => {
            const newX = x + pos.dx;
            const newY = y + pos.dy;
            
            if (newX >= 0 && newX < this.COLS && newY >= 0 && newY < this.ROWS) {
                if (this.board[newY][newX] !== 0) {
                    this.board[newY][newX] = 0;
                    this.score += 8; // Bonus points
                }
            }
        });
    }
    
    createMiniExplosion(centerX, centerY, color) {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 2,
                color: color,
                life: 0.8,
                decay: 0.025,
                type: 'mini_explode'
            });
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new ModernTetris();
});