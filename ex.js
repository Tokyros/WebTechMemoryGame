try {
    const $ = require('jquery')
} catch (e) {
    console.log('REMOVE WHEN DONE')
}

if (window.openDatabase) {
    var mydb = openDatabase("cars", "0.1", "A Database of Cars I Like", 1024 * 1024);
    mydb.transaction(function (t) {
        t.executeSql("CREATE TABLE IF NOT EXISTS cars (car STRING)");
    });
} else {
    alert("WebSQL is not supported by your browser!");
}

function updateCarList(transaction, results) {
    var listitems = "";
    var listholder = document.getElementById("carlist");
    listholder.innerHTML = "";
    var i;
    for (i = 0; i < results.rows.length; i++) {
        var row = results.rows.item(i);
        var car = JSON.parse(row.car)

        listholder.innerHTML += "<li>Model - " + car.model + " Type - " + car.type + "</li>";
    }
}

//function to get the list of cars from the database

function outputCars() {
    //check to ensure the mydb object has been created
    if (mydb) {
        //Get all the cars from the database with a select statement, set outputCarList as the callback function for the executeSql command
        mydb.transaction(function (t) {
            t.executeSql("SELECT * FROM cars", [], updateCarList);
        });
    } else {
        alert("db not found, your browser does not support web sql!");
    }
}

//function to add the car to the database

function addCar() {
    if (mydb) {
        var model = document.getElementById("carmodel").value;
        var car = {
            model: model,
            type: "SUV"
        };
        if (model !== "") {
            mydb.transaction(function (t) {
                t.executeSql("INSERT INTO cars (car) VALUES (?)", [JSON.stringify(car)]);
                outputCars();
            });
        } else {
            alert("You must enter a make and model!");
        }
    } else {
        alert("db not found, your browser does not support web sql!");
    }
}

// outputCars();

function shuffle(arr) {
    return arr.sort(function (a, b) { return 0.5 - Math.random() })
}

function createBoard(boardSize) {
    let currentCard = 1;
    const board = new Array(boardSize * boardSize).fill('').map((_, i) => {
        if (i % 2 === 1) {
            return currentCard++;
        } else {
            return currentCard
        }
    });
    return shuffle(board);
}

function createGameConfiguration(gridSize) {
    const board = createBoard(gridSize);
    // const player1 = prompt("Enter player 1 name");
    // const player2 = prompt("Enter player 2 name");

    return {
        // player1,
        // player2,
        board
    }
}

class Player {
    static playerCount = 0;

    constructor(playerName) {
        this.playerName = playerName;
        this.score = 0;
        this.playerNumber = ++Player.playerCount;
        this.initializeElement();
    }

    initializeElement() {
        this.element = $('<div></div>');
        this.element.attr('id', this.playerName);
        this.element.addClass('player');
        
        this.playerNameElement = $('<div></div>');
        this.playerNameElement.addClass(`name-${this.playerNumber}`);
        this.playerNameElement.text(this.playerName);

        this.scoreElement = $('<div></div>');
        this.scoreElement.addClass('score');
        this.scoreElement.text(this.score);

        this.element.append('<h1>Player: <h1>')
        this.element.append(this.playerNameElement);
        this.element.append(this.scoreElement);
    }

    incrementScore() {
        this.score++;
        this.updateScore();
    }

    updateScore() {
        this.scoreElement.text(this.score);
    }
}

class Board {
    constructor(boardSize, onFlipCell, getCurrentPlayer) {
        this.boardSize = boardSize;
        this.flippedCellId = null;
        this.cells = createBoard(boardSize).map((value, i) => new Cell(i, value, Math.floor(i / boardSize)))
        this.cells.forEach((cell) => {
            cell.registerOnClick(async () => {
                if (!cell.isCellSuccessful() && !this.lockFlipping) {
                    const currentPlayer = getCurrentPlayer();
                    const result = await this.flipCell(cell.id, currentPlayer);
                    onFlipCell(result);
                }
            })
        })
    }

    isGameOver() {
        return this.cells.every((cell) => cell.isCellSuccessful())
    }

    getCell(cellId) {
        return this.cells[cellId];
    }

    flipCell(cellId, currentPlayer) {
        return new Promise((res) => {
            const cellToFlip = this.getCell(cellId);
            if (this.flippedCellId !== null) {
                this.lockFlipping = true;
                if (this.flippedCellId === cellToFlip.id) {
                    res();
                    return;
                }
                cellToFlip.markCellAsPending();
                setTimeout(() => {
                    const flippedCell = this.getCell(this.flippedCellId);
                    this.flippedCellId = null;
                    if (cellToFlip.value === flippedCell.value) {
                        cellToFlip.markCellAsSuccess(currentPlayer.playerNumber);
                        flippedCell.markCellAsSuccess(currentPlayer.playerNumber);
                        res('success');
                    } else {
                        cellToFlip.markCellAsFailure();
                        flippedCell.markCellAsFailure();
                        res('failure');
                    }
                }, 1000)
            } else {
                cellToFlip.markCellAsPending();
                this.flippedCellId = cellId;
                res('pending');
            }
        }).then((res) => {
            this.lockFlipping = false;
            return res;
        });
    }

    render() {
        return this.cells.map((cell) => cell.element);
    }
}

class Cell {
    constructor(id, value, row) {
        this.id = id;
        this.value = value;
        this.row = row;
        this.initializeElement();
    }

    initializeElement() {
        this.element = $('<div></div>');
        this.element.attr('id', this.id);
        this.element.css('grid-row', this.row);
        this.clearCellStatus();
        this.element.append(`<img src="https://picsum.photos/id/${1057 + this.value}/140/140">`);
    }

    clearCellStatus() {
        this.element.removeClass();
        this.element.addClass('cell');
    }

    markCellAsPending() {
        this.clearCellStatus();
        this.element.addClass('pending');
    }

    markCellAsSuccess(playerNumber) {
        this.clearCellStatus();
        this.element.addClass('success');
        this.element.css('background-color', playerNumber === 1 ? 'blue' : 'red');
    }

    markCellAsFailure() {
        setTimeout(() => this.clearCellStatus(), 500);
    }

    isCellSuccessful() {
        return this.element.hasClass('success');
    }

    registerOnClick(onClick) {
        this.element.click(onClick);
    }
}

class Game {
    constructor(boardSize, player1, player2) {
        this.board = new Board(boardSize, (result) => this.onFlipCell(result), () => this.getCurrentPlayer());
        this.player1 = player1;
        this.player2 = player2;
        this.currentPlayer = this.player1;
    }

    onFlipCell(result) {
        switch (result) {
            case 'success':
                this.incrementPlayerScore(this.currentPlayer)
                break;
            case 'failure':
                this.currentPlayer = this.currentPlayer.playerName === this.player1.playerName ? this.player2 : this.player1;
                break;
        }

        if (this.board.isGameOver()) {
            $('#modal').css('display', 'flex');
            if (this.player1.score === this.player2.score) {
                $('#game-status').text("It's a tie!");
            } else {
                const winner = this.player1.score > this.player2.score ? this.player1.playerName : this.player2.playerName;
                $('#game-status').text(`${winner} wins!`);
            }
        }
    }

    getCurrentPlayer() {
        return this.currentPlayer;
    }

    incrementPlayerScore(player) {
        player.incrementScore();
    }

    render() {
        $('.score-board').append(
            this.player1.element,
            this.player2.element,
        )
        $('.game-board').html(this.board.render())
    }

    static createGame(gridSize) {
        const {board} = createGameConfiguration(gridSize)
        return new Game(board)
    }
}


function startGame(boardSize) {
    const game = new Game(boardSize, new Player('Dor'), new Player("Shahar"));
    game.render();
}

startGame(4);