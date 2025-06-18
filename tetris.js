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
        this.currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = y + this.currentPiece.pos.y;
                    const boardX = x + this.currentPiece.pos.x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = value;
                    }
                }
            });
        });
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
            this.clearLines();
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
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new ModernTetris();
});