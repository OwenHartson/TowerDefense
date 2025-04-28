/*================================================================

Tower Defense Game - Version 1.0.9

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
let mouseX = 0; // Mouse X position
let mouseY = 0; // Mouse Y position

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
// #7DF9FF - Electric blue
// #AFE1AF - Celadon green
// #FFB6C1 - Light pink
const towerTypes = [
    { name: 'Basic Tower', cost: 50, range: 100, damage: 20, cooldown: 50, color: '#7DF9FF', description: '' },
    { name: 'Sniper Tower', cost: 100, range: 200, damage: 50, cooldown: 100, color: '#AFE1AF', description: '' },
    { name: 'Rapid Tower', cost: 75, range: 80, damage: 10, cooldown: 20, color: '#FFB6C1', description: '' },
    { name: 'Flame Tower', cost: 200, range: 120, damage: 35, cooldown: 80, color: '#FF4500', description: 'Deals 50 damage every 3 seconds', damageOverTime: 50, duration: 3 },
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
    constructor(x, y, target, damage, color, damageOverTime = 0, duration = 0) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 5; // Speed of the projectile
        this.radius = 5; // Size of the projectile
        this.color = color; // Color of the projectile
        this.damageOverTime = damageOverTime; // Damage over time
        this.duration = duration; // Duration of the DoT effect
    }

    move() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            // Hit the target
            this.target.health -= this.damage;

            // Apply damage over time if specified
            if (this.damageOverTime > 0 && this.duration > 0) {
                this.target.applyDamageOverTime(this.damageOverTime, this.duration);
            }

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
        this.isFlameTower = type.name === 'Flame Tower'; // Check if this is a Flame Tower
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
                if (this.isFlameTower) {
                    // Flame Tower deals damage over time
                    let obj = findObjectByName(towerTypes, 'Flame Tower');
                    this.projectiles.push(new Projectile(this.x, this.y, enemy, this.damage, this.color, obj.damageOverTime, obj.duration)); // 5 DoT damage for 3 seconds
                } else {
                    // Regular tower
                    this.projectiles.push(new Projectile(this.x, this.y, enemy, this.damage, this.color));
                }
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
        this.dotTimers = []; // Array to track DoT effects
    }

    applyDamageOverTime(damage, duration) {
        const interval = 1000; // Apply damage every second
        const ticks = Math.floor(duration / (interval / 1000)); // Number of ticks
        for (let i = 0; i < ticks; i++) {
            this.dotTimers.push(setTimeout(() => {
                this.health -= damage;
            }, i * interval));
        }
    }

    clearDoT() {
        // Clear all DoT timers when the enemy is removed
        this.dotTimers.forEach(timer => clearTimeout(timer));
        this.dotTimers = [];
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
            this.clearDoT(); // Clear DoT timers when the enemy reaches the end
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
Enemy Sub-Class (Tank)
================================================================*/
class TankEnemy extends Enemy {
    constructor() {
        super();
        this.health = baseEnemyHealth * 1.5; // 1.5 times the current enemy health
        this.maxHealth = this.health; // Update max health for the health bar
        this.color = 'blue'; // Set the color of the enemy
        this.size = 30; // Slightly larger size
    }

    draw() {
        // Draw the enemy
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        // Draw the health bar
        const healthBarWidth = 50;
        const healthBarHeight = 10;
        const healthPercentage = this.health / this.maxHealth; // Calculate health percentage
        const healthBarX = this.x - healthBarWidth / 2;
        const healthBarY = this.y - this.size / 2 - 12; // Position above the enemy

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

    const columnCount = 2; // Number of columns
    const itemWidth = 150; // Width of each shop item
    const itemHeight = 50; // Default height of each shop item
    const itemSpacing = 15; // Spacing between items
    const shopX = canvas.width - (columnCount * (itemWidth + itemSpacing)); // Position the shop in the top-right corner
    const shopY = 10; // Margin from the top
    const shopWidth = columnCount * (itemWidth + itemSpacing) - itemSpacing; // Total width of the shop
    const rowCount = Math.ceil(towerTypes.length / columnCount); // Number of rows
    const shopHeight = rowCount * (itemHeight + itemSpacing) - itemSpacing; // Total height of the shop

    // Check if the click is inside the shop area
    if (x >= shopX - 10 && x <= shopX - 10 + shopWidth + 20 && y >= shopY - 10 && y <= shopY - 10 + shopHeight + 20) {
        // Check if the click is in the shop area
        towerTypes.forEach((tower, index) => {
            const column = index % columnCount; // Determine the column (0 or 1)
            const row = Math.floor(index / columnCount); // Determine the row
            const buttonX = shopX + column * (itemWidth + itemSpacing); // Calculate x position
            const buttonY = shopY + row * (itemHeight + itemSpacing); // Calculate y position

            // Adjust box size based on selection
            const isSelected = selectedTowerType === tower;
            const boxHeight = isSelected ? 120 : itemHeight; // Expand height if selected

            // Check if the click is within the button
            if (x >= buttonX && x <= buttonX + itemWidth && y >= buttonY && y <= buttonY + boxHeight) {
                selectedTowerType = tower; // Select the tower type
            }
        });

        return; // Prevent placing the tower if the click is inside the shop
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

// Update mouse position on mousemove
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
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
function findObjectByName(array, name) {
    return array.find(obj => obj.name === name);
}

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
    drawText(`Enemies Spawned: ${enemiesSpawned} / ${enemiesPerLevel}`, 10, 110);
    drawText(`Enemy Speed: ${ENEMY_SPEED.toFixed(1)}`, 10, 140);
    drawText(`Enemy Health (lvl ${level}): ${baseEnemyHealth}`, 10, 170);
}

function drawShop() {
    const columnCount = 2; // Number of columns
    const itemWidth = 150; // Width of each shop item
    const itemHeight = 50; // Default height of each shop item
    const itemSpacing = 15; // Spacing between items
    const shopX = canvas.width - (columnCount * (itemWidth + itemSpacing)); // Position the shop in the top-right corner
    const shopY = 10; // Margin from the top

    // Calculate the shop width and height dynamically
    const shopWidth = columnCount * (itemWidth + itemSpacing) - itemSpacing;
    const rowCount = Math.ceil(towerTypes.length / columnCount); // Number of rows
    const shopHeight = rowCount * (itemHeight + itemSpacing) - itemSpacing;

    // Draw the shop background
    ctx.fillStyle = '#f0f0f0'; // Light gray background
    ctx.fillRect(shopX - 10, shopY - 10, shopWidth + 20, shopHeight + 20); // Add padding around the shop

    // Separate the top and bottom rows
    const topRowItems = [];
    const bottomRowItems = [];

    towerTypes.forEach((tower, index) => {
        const row = Math.floor(index / columnCount); // Determine the row
        if (row === 0) {
            topRowItems.push({ tower, index });
        } else {
            bottomRowItems.push({ tower, index });
        }
    });

    // Helper function to wrap text
    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && i > 0) {
                ctx.fillText(line, x, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }

    // Function to draw a single shop item
    const drawShopItem = (tower, index) => {
        const column = index % columnCount; // Determine the column (0 or 1)
        const row = Math.floor(index / columnCount); // Determine the row
        const x = shopX + column * (itemWidth + itemSpacing); // Calculate x position
        const y = shopY + row * (itemHeight + itemSpacing); // Calculate y position

        // Check if the mouse is hovering over this item
        const isHovered = mouseX >= x && mouseX <= x + itemWidth && mouseY >= y && mouseY <= y + itemHeight;

        // Check if the tower is selected
        const isSelected = selectedTowerType === tower;

        // Adjust box size and style based on hover state
        const boxHeight = isHovered ? 150 : itemHeight; // Expand height if hovered
        const boxColor = isHovered ? tower.color : '#ffffff'; // Light blue for hovered, white otherwise

        // Draw tower button
        ctx.fillStyle = boxColor;
        ctx.fillRect(x, y, itemWidth, boxHeight);

        // Draw tower border
        if (isSelected) {
            ctx.strokeStyle = tower.color; // Border for selected tower
            ctx.lineWidth = 4;
        } else if (isHovered) {
            ctx.strokeStyle = tower.color; // Blue border for hovered tower
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = '#cccccc'; // Gray border for unselected tower
            ctx.lineWidth = 2;
        }
        ctx.strokeRect(x, y, itemWidth, boxHeight);

        // Draw tower name
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.fillText(tower.name, x + 10, y + 20);

        // If the item is hovered, display additional details
        if (isHovered) {
            ctx.font = '14px Arial';
            ctx.fillText(`Cost: $${tower.cost}`, x + 10, y + 50);
            ctx.fillText(`Range: ${tower.range}`, x + 10, y + 70);
            ctx.fillText(`Damage: ${tower.damage}`, x + 10, y + 90);
            ctx.fillText(`Description:`, x + 10, y + 110);

            // Wrap and draw the description text
            ctx.font = '12px Arial';
            wrapText(ctx, tower.description, x + 20, y + 125, itemWidth - 20, 14);
        }
    };

    // Draw the bottom row items first
    bottomRowItems.forEach(({ tower, index }) => drawShopItem(tower, index));

    // Draw the top row items last (so they appear above the bottom row)
    topRowItems.forEach(({ tower, index }) => drawShopItem(tower, index));
}
/*..............................................................*/


/*================================================================
Game Logic Functions
================================================================*/
function spawnEnemy() {
    enemiesSpawned++;

    // Check if this is the last enemy in the wave
    if (enemiesSpawned === enemiesPerLevel) {
        enemies.push(new TankEnemy()); // Spawn a tank enemy as the last enemy
    } else {
        enemies.push(new Enemy()); // Spawn a regular enemy
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.move() || enemy.health <= 0) {
            enemies.splice(i, 1);

            // Reward money based on enemy type
            if (enemy.health <= 0) {
                if (enemy instanceof TankEnemy) {
                    money += 20; // Double the money for TankEnemy
                } else {
                    money += 10; // Regular money for normal enemies
                }
            }
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
    baseEnemyHealth += (15 * (level - 1)); // Increase enemy health slightly
}

function resetGame() {
    // Reset game state
    level = 1;
    enemiesPerLevel = 5;
    enemiesSpawned = 0;
    money = 100;
    lives = 10;
    ENEMY_SPEED = 1;
    baseEnemyHealth = 100; // Reset enemy health
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