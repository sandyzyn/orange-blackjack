// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract OrangeBlackjack {
    IERC20 public constant LUSD = IERC20(0x9142FA65aAEf921Aea2127e88758adeE0510a0F0);
    address public constant OWNER = 0x29821A88A2CB149B8519d38226F9A8c58Ab6cDA3;

    enum GameState { NotStarted, PlayerTurn, DealerTurn, Finished }

    struct Game {
        GameState state;
        uint256 betAmount;
        uint8[] playerHand;
        uint8[] dealerHand;
    }

    mapping(address => Game) public games;

    uint8 constant BLACKJACK = 21;
    uint8 constant DEALER_STAND = 17;

    event GameStarted(address indexed player, uint256 bet);
    event CardDealt(address indexed player, uint8 card);
    event GameEnded(address indexed player, string result, uint256 payout);

    modifier onlyPlayer() {
        require(msg.sender == tx.origin, "Contracts not allowed");
        _;
    }

    function placeBet(uint256 amount) external onlyPlayer {
        Game storage game = games[msg.sender];
        require(game.state == GameState.NotStarted || game.state == GameState.Finished, "Game already in progress");
        require(amount > 0, "Bet must be > 0");

        require(LUSD.transferFrom(msg.sender, address(this), amount), "LUSD transfer failed");
        require(LUSD.balanceOf(address(this)) >= amount * 2, "Contract can't cover 2x payout");

        // Reset state
        delete game.playerHand;
        delete game.dealerHand;

        game.betAmount = amount;
        game.state = GameState.PlayerTurn;
        game.playerHand.push(_randomCard("p1"));
        game.playerHand.push(_randomCard("p2"));
        game.dealerHand.push(_randomCard("d1"));
        game.dealerHand.push(_randomCard("d2"));

        emit GameStarted(msg.sender, amount);
    }

    function hit() external onlyPlayer {
        Game storage game = games[msg.sender];
        require(game.state == GameState.PlayerTurn, "Not your turn");

        uint8 card = _randomCard("hit");
        game.playerHand.push(card);
        emit CardDealt(msg.sender, card);

        if (_handValue(game.playerHand) > BLACKJACK) {
            game.state = GameState.Finished;
            emit GameEnded(msg.sender, "Player busts", 0);
        }
    }

    function stand() external onlyPlayer {
        Game storage game = games[msg.sender];
        require(game.state == GameState.PlayerTurn, "Not your turn");

        game.state = GameState.DealerTurn;

        while (_handValue(game.dealerHand) < DEALER_STAND) {
            game.dealerHand.push(_randomCard("deal"));
        }

        uint256 playerScore = _handValue(game.playerHand);
        uint256 dealerScore = _handValue(game.dealerHand);
        uint256 payout = 0;
        string memory result;

        if (dealerScore > BLACKJACK || playerScore > dealerScore) {
            payout = game.betAmount * 2;
            LUSD.transfer(msg.sender, payout);
            result = "Player wins";
        } else if (playerScore == dealerScore) {
            payout = game.betAmount;
            LUSD.transfer(msg.sender, payout);
            result = "Tie";
        } else {
            result = "Dealer wins";
        }

        game.state = GameState.Finished;
        emit GameEnded(msg.sender, result, payout);
    }

    function getMyHand() external view onlyPlayer returns (uint8[] memory) {
        return games[msg.sender].playerHand;
    }

    function getDealerVisibleCard() external view onlyPlayer returns (uint8) {
        require(games[msg.sender].dealerHand.length > 0, "Game not started");
        return games[msg.sender].dealerHand[0];
    }

    function getGameState() external view onlyPlayer returns (GameState) {
        return games[msg.sender].state;
    }

    function _handValue(uint8[] memory hand) internal pure returns (uint256 total) {
        for (uint256 i = 0; i < hand.length; i++) {
            total += hand[i];
        }
    }

    function _randomCard(string memory tag) internal view returns (uint8) {
        return uint8(uint256(keccak256(abi.encodePacked(tag, block.timestamp, msg.sender, block.prevrandao))) % 10 + 1);
    }

    // View functions for testing or analytics
    function getDealerHand() external view onlyPlayer returns (uint8[] memory) {
        return games[msg.sender].dealerHand;
    }

    function getBetAmount() external view onlyPlayer returns (uint256) {
        return games[msg.sender].betAmount;
    }
}
