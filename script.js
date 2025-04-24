/*================================================================

Tower Defense Game - Version 1.0.2

================================================================*/


/*================================================================
Global Variables
================================================================*/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 50;
let ENEMY_SPEED = 1;
const enemies = [];
const towers = [];
let level = 1;
let enemiesPerLevel = 5;
let enemiesSpawned = 0;
let baseEnemyHealth = 100; // Base health for enemies
let money = 100;
let lives = 10;
let previewTower = null; // Holds the preview tower object

// Path for enemies to follow
const path = [
    { x: 0, y: 400 },
    { x: 100, y: 400 },
    { x: 100, y: 450 },
    { x: 300, y: 450 },
    { x: 300, y: 200 },
    { x: 400, y: 200 },
    { x: 400, y: 500 },
    { x: 500, y: 500 },
    { x: 500, y: 400 },
    { x: 600, y: 400 },
    { x: 600, y: 400 },
    { x: canvas.width, y: 400 }
];

// Tower types and their properties (show up in the tower selection menu)
const towerTypes = [
    { name: 'Basic Tower', cost: 50, range: 100, damage: 20, cooldown: 50, color: '#4287f5' },
    { name: 'Sniper Tower', cost: 100, range: 200, damage: 50, cooldown: 100, color: 'green' },
    { name: 'Rapid Tower', cost: 75, range: 80, damage: 10, cooldown: 20, color: 'purple' }
];

let selectedTowerType = towerTypes[0]; // Default selected tower type

let startGameButton = document.getElementById('startGame');
let restartButton = document.getElementById('restartGame');
/*..............................................................*/


/*================================================================
Main Game Loop / Start Function / Game Over Function
================================================================*/
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawPath();
    updateEnemies();
    updateTowers();
    drawUI();
    drawShop();

    // Draw the preview tower if it exists
    if (previewTower) {
        previewTower.drawPreview(previewTower.x, previewTower.y);
    }

    if (enemiesSpawned === enemiesPerLevel) {
        increaseDifficulty();
        enemiesSpawned = 0;
    }

    if (lives > 0) {
        requestAnimationFrame(gameLoop);
    } else {
        gameOverScreen();
    }
}

if (startGameButton) {
    startGameButton.addEventListener('click', () => {
        // Hide the start button and show the game canvas
        startGameButton.style.display = 'none';
        canvas.style.display = 'block';

        // Start the game loop
        setInterval(spawnEnemy, 2000);
        gameLoop();
    });
}

function gameOverScreen() {
    ctx.fillStyle = 'red';
    ctx.font = '40px Arial';
    ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText('Click to Restart', canvas.width / 2 - 80, canvas.height / 2 + 40);

    // Add a one-time click listener to restart the game
    canvas.addEventListener('click', resetGame, { once: true });
}
/*..............................................................*/


/*================================================================
Projectile Class
================================================================*/
class Projectile {
    constructor(x, y, target, damage, color) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 5; // Speed of the projectile
        this.radius = 5; // Size of the projectile
        this.color = color; // Color of the projectile
    }

    move() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            // Hit the target
            this.target.health -= this.damage;
            return true; // Mark projectile for removal
        } else {
            // Move towards the target
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        return false; // Projectile is still active
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
/*..............................................................*/


/*================================================================
Tower Class
================================================================*/
class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.range = type.range;
        this.damage = type.damage;
        this.cooldown = 0;
        this.maxCooldown = type.cooldown;
        this.color = type.color;
        this.showRange = false; // Flag to show/hide the range circle
        this.projectiles = []; // Store projectiles fired by this tower
    }

    shoot() {
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }

        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.range) {
                // Fire a projectile at the enemy
                this.projectiles.push(new Projectile(this.x, this.y, enemy, this.damage, this.color));
                this.cooldown = this.maxCooldown; // Reset cooldown
                break;
            }
        }
    }

    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            if (projectile.move()) {
                // Remove the projectile if it hits the target
                this.projectiles.splice(i, 1);
            } else {
                projectile.draw();
            }
        }
    }

    draw() {
        // Draw the tower
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);

        // Draw the range circle if the flag is set
        if (this.showRange) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.stroke();
        }

        // Update and draw projectiles
        this.updateProjectiles();
    }

    drawPreview(x, y) {
        // Draw the preview tower
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.5; // Make it semi-transparent
        ctx.fillRect(x - 15, y - 15, 30, 30);

        // Draw the range circle
        ctx.beginPath();
        ctx.arc(x, y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.stroke();
        ctx.globalAlpha = 1.0; // Reset transparency
    }
}
/*..............................................................*/


/*================================================================
Enemy Class
================================================================*/
class Enemy {
    constructor() {
        this.x = path[0].x;
        this.y = path[0].y;
        this.speed = ENEMY_SPEED;
        this.pathIndex = 0;
        this.health = baseEnemyHealth; // Default health for the enemy
        this.maxHealth = baseEnemyHealth; // Store the maximum health for scaling the health bar
    }

    move() {
        if (this.pathIndex < path.length - 1) {
            const target = path[this.pathIndex + 1];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.speed) {
                this.x = target.x;
                this.y = target.y;
                this.pathIndex++;
            } else {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        } else {
            lives--;
            return true; // Enemy reached the end
        }
        return false;
    }

    draw() {
        // Draw the enemy
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 10, this.y - 10, 20, 20);

        // Draw the health bar
        const healthBarWidth = 50;
        const healthBarHeight = 10;
        //const healthPercentage = this.health > this.maxHealth ? this.health / (this.maxHealth + this.health) : this.health / this.maxHealth; // Calculate health percentage
        const healthPercentage = this.health / this.maxHealth; // Calculate health percentage
        const healthBarX = this.x - healthBarWidth / 2;
        const healthBarY = this.y - 22; // Position above the enemy

        // Background of the health bar (gray)
        ctx.fillStyle = 'gray';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        // Foreground of the health bar (green)
        ctx.fillStyle = 'green';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
    }
}
/*..............................................................*/


/*================================================================
Event Listeners
================================================================*/
// Mouse move event to update the preview tower position
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (previewTower) {
        previewTower.x = mouseX;
        previewTower.y = mouseY;
    }
});

// Handle shop clicks
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const shopWidth = 150 * towerTypes.length + 10;
    const shopX = canvas.width - shopWidth;
    const shopY = 10;

    // Check if the click is in the shop area
    if (x >= shopX && x <= shopX + shopWidth && y >= shopY && y <= shopY + 120) {
        towerTypes.forEach((tower, index) => {
            const buttonX = shopX + 10 + index * 150;
            const buttonY = shopY + 10;

            if (x >= buttonX && x <= buttonX + 130 && y >= buttonY && y <= buttonY + 100) {
                selectedTowerType = tower; // Select the tower type
            }
        });
        return;
    }

    // Check if the tower overlaps with an existing tower
    if (isTowerOverlapping(x, y)) {
        return; // Prevent placing the tower
    }

    // Check if the tower overlaps with the path
    if (isTowerOverlappingPath(x, y)) {
        return; // Prevent placing the tower
    }

    // Place the tower if the player has enough money
    if (money >= selectedTowerType.cost) {
        towers.push(new Tower(x, y, selectedTowerType));
        money -= selectedTowerType.cost;
        previewTower = null; // Remove the preview tower after placing
    }
});

// When a tower type is selected, create a preview tower
canvas.addEventListener('mousemove', (event) => {
    if (selectedTowerType) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        previewTower = new Tower(mouseX, mouseY, selectedTowerType);
    }
});

// Add mousemove event to detect hovering over towers
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Check if the mouse is hovering over any tower
    towers.forEach((tower) => {
        const dx = tower.x - mouseX;
        const dy = tower.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= 15) {
            tower.showRange = true; // Show the range circle
        } else {
            tower.showRange = false; // Hide the range circle
        }
    });

    // Update the preview tower position
    if (previewTower) {
        previewTower.x = mouseX;
        previewTower.y = mouseY;
    }
});
/*..............................................................*/


/*================================================================
Utility Functions
================================================================*/
function drawText(text, x, y, font = '20px Arial', color = 'black') {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(text, x, y);
}

function drawPath() {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (const point of path) {
        ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
}

function drawUI() {
    drawText(`Money: $${money}`, 10, 20);
    drawText(`Lives: ${lives}`, 10, 50);
    drawText(`Level: ${level}`, 10, 80);
    drawText(`Enemies Spawned: ${enemiesSpawned}`, 10, 110);
    drawText(`Enemies per Level: ${enemiesPerLevel}`, 10, 140);
    drawText(`Enemy Speed: ${ENEMY_SPEED.toFixed(1)}`, 10, 170);
}

function drawShop() {
    const shopWidth = 150 * towerTypes.length + 10; // Calculate shop width based on the number of tower types
    const shopX = canvas.width - shopWidth; // Position the shop in the top-right corner
    const shopY = 10; // Margin from the top

    // Draw the shop background
    ctx.fillStyle = 'lightgray';
    ctx.fillRect(shopX, shopY, shopWidth, 120);

    towerTypes.forEach((tower, index) => {
        const x = shopX + 10 + index * 150; // Position each tower button horizontally
        const y = shopY + 10; // Margin from the top of the shop

        // Check if the player can afford the tower
        if (money >= tower.cost) {
            ctx.fillStyle = tower.color; // Use the tower's color if affordable
        } else {
            ctx.fillStyle = 'gray'; // Use gray if the player cannot afford it
        }

        // Draw tower button
        ctx.fillStyle = tower.color;
        ctx.fillRect(x, y, 130, 100);

        // Draw tower details
        ctx.fillStyle = 'black';
        ctx.font = '14px Arial';
        ctx.fillText(tower.name, x + 5, y + 20);
        ctx.fillText(`Cost: $${tower.cost}`, x + 5, y + 40);
        ctx.fillText(`Range: ${tower.range}`, x + 5, y + 60);
        ctx.fillText(`Damage: ${tower.damage}`, x + 5, y + 80);

        // Highlight the selected tower
        if (selectedTowerType === tower) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, 130, 100);
        }
    });
}
/*..............................................................*/


/*================================================================
Game Logic Functions
================================================================*/
function spawnEnemy() {
    enemiesSpawned++;
    enemies.push(new Enemy());
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.move() || enemy.health <= 0) {
            enemies.splice(i, 1);
            if (enemy.health <= 0) money += 10;
        } else {
            enemy.draw();
        }
    }
}

function updateTowers() {
    for (const tower of towers) {
        tower.shoot();
        tower.draw();
    }
}

function increaseDifficulty() {
    level++;
    enemiesPerLevel += 2; // Increase the number of enemies per level
    ENEMY_SPEED += 0.2; // Increase enemy speed slightly
    baseEnemyHealth += (20 * (level - 1)); // Increase enemy health slightly
}

function resetGame() {
    // Reset game state
    level = 1;
    enemiesPerLevel = 5;
    enemiesSpawned = 0;
    money = 100;
    lives = 10;
    ENEMY_SPEED = 1;
    enemies.length = 0; // Clear enemies array
    towers.length = 0; // Clear towers array

    // Restart the game loop
    gameLoop();
}

// Function to check if a tower overlaps with any existing towers
function isTowerOverlapping(x, y) {
    const towerSize = 20; // Size of the tower (width and height)
    for (const tower of towers) {
        const dx = tower.x - x;
        const dy = tower.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if the distance between the centers is less than the tower size
        if (distance < towerSize) {
            return true; // Overlap detected
        }
    }
    return false; // No overlap
}

// Function to check if a tower overlaps with the path
function isTowerOverlappingPath(x, y) {
    const towerRadius = 30; // Radius of the tower (half of its size)

    for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];

        // Calculate the distance from the tower to the line segment
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        let t = ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t)); // Clamp t to the range [0, 1]

        const closestX = start.x + t * dx;
        const closestY = start.y + t * dy;

        const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

        if (distance < towerRadius) {
            return true; // Overlap detected
        }
    }

    return false; // No overlap with the path
}
/*..............................................................*/