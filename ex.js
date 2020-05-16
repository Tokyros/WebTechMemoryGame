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
    const cardCount = boardSize * boardSize;
    const maxCardValue = Math.floor(cardCount / 2);
    const board = new Array(cardCount).fill('').map((_, i) => {
        if (currentCard > maxCardValue) {
            return -1;
        }
        if (i % 2 === 1) {
            return currentCard++;
        } else {
            return currentCard
        }
    });
    return shuffle(board);
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
        this.playerNameElement.addClass(`player-score`);
        this.updateScore();

        this.element.append(this.playerNameElement);
    }

    incrementScore() {
        this.score++;
        this.updateScore();
    }

    updateScore() {
        this.playerNameElement.text(`${this.playerName} score: ${this.score}`);
    }
}

class Board {
    constructor(boardSize, onCellFlipped, getCurrentPlayer) {
        this.boardSize = boardSize;
        this.pendingFlippedCellId = null;
        this.isLocked = false;
        this.cells = createBoard(boardSize).map((value, i) => new Cell(i, value, Math.floor(i / boardSize)))
        this.cells.forEach((cell) => this.registerOnCellClick(cell, onCellFlipped, getCurrentPlayer))
    }

    registerOnCellClick(cell, onCellFlipped, getCurrentPlayer) {
        cell.registerOnClick(async () => {
            if (!cell.isCellSuccessful() && !this.isLocked && cell.value !== -1) {
                const result = await this.flipCell(cell.id, getCurrentPlayer());
                onCellFlipped(result);
            }
        })
    }

    isGameOver() {
        return this.cells.every((cell) => cell.value === -1 || cell.isCellSuccessful())
    }

    getCell(cellId) {
        return this.cells[cellId];
    }

    lock() {
        this.isLocked = true;
    }

    unlock() {
        this.isLocked = false;
    }

    flipCell(cellId, currentPlayer) {
        const cellToFlip = this.getCell(cellId);

        if (this.pendingFlippedCellId === null) {
            cellToFlip.markCellAsPending();
            this.pendingFlippedCellId = cellId;
            return Promise.resolve('pending');
        }

        if (this.pendingFlippedCellId === cellToFlip.id) {
            return Promise.resolve('neutral');
        }

        this.lock();
        return new Promise((res) => {
            cellToFlip.markCellAsPending();
            const pendingFlippedCell = this.getCell(this.pendingFlippedCellId);
            this.pendingFlippedCellId = null;
            // Delay the result for one second, 
            setTimeout(() => {
                const result = this.checkCellMatch(cellToFlip, pendingFlippedCell, currentPlayer);
                res(result);
                setTimeout(() => {
                    this.unlock();
                }, 650);
            }, 1000)
        });
    }

    checkCellMatch(cellA, cellB, currentPlayer) {
        if (cellA.value === cellB.value) {
            cellA.markCellAsSuccess(currentPlayer.playerNumber);
            cellB.markCellAsSuccess(currentPlayer.playerNumber);
            return 'success';
        } else {
            cellA.markCellAsFailure();
            cellB.markCellAsFailure();
            return 'failure';
        }
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
        if (this.value === -1) {
            this.element.addClass('unpaired-card')
        }
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

class Modal {
    constructor() {
        $('#modal').click(() => this.hide());
        $('#game-status').click((e) => e.stopPropagation());
    }

    hide() {
        $('#modal').css('display', 'none');
    }

    show() {
        $('#modal').css('display', 'flex');
    }

    setText(text) {
        $('#game-status').text(text);
    }
}

class Game {
    constructor(boardSize, player1, player2) {
        this.board = new Board(boardSize, (result) => this.onFlipCell(result), () => this.getCurrentPlayer());
        this.player1 = player1;
        this.player2 = player2;
        this.setCurrentPlayer(player1);
        this.modal = new Modal();
    }

    setCurrentPlayer(player) {
        this.currentPlayer = player;
        $('.current-player').text(`Current player: ${this.currentPlayer.playerName}`);
    }

    getNextPlayer() {
        return this.currentPlayer.playerName === this.player1.playerName ? this.player2 : this.player1
    }

    onFlipCell(result) {
        switch (result) {
            case 'success':
                this.incrementPlayerScore(this.currentPlayer)
                break;
            case 'failure':
                this.setCurrentPlayer(this.getNextPlayer());
                break;
        }

        if (this.board.isGameOver()) {
            this.modal.show();
            if (this.player1.score === this.player2.score) {
                this.modal.setText("It's a tie!")
            } else {
                const winner = this.player1.score > this.player2.score ? this.player1.playerName : this.player2.playerName;
                this.modal.setText(`${winner} wins!`);
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
        return new Game(createBoard(gridSize))
    }
}


function startGame(boardSize) {
    if (boardSize >= 3) {
        $(".score-board").empty();
        $(".game-board").empty();
        const game = new Game(boardSize, new Player($('#player1-name-input').val()), new Player($("#player2-name-input").val()));
        game.render();
        $(".game-setup").hide()
        $('.current-player').show()
    } else {
        alert('Board size must be at least 3!')
    }
}
