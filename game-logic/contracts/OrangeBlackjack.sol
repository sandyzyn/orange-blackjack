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
        GameOutcome outcome;
    }

    struct GameOutcome {
        string result;
        uint256 payout;
    }

    struct PlayerStats {
        uint256 wins;
        uint256 losses;
        uint256 ties;
        uint256 blackjacks;
        uint256 lifetimeEarnings;
        uint256 totalBets;
    }

    mapping(address => Game) public games;
    mapping(address => PlayerStats) public stats;
    address[] public allPlayers;
    mapping(address => bool) internal hasPlayed;

    uint8 constant BLACKJACK = 21;
    uint8 constant DEALER_STAND = 17;

    address public topPlayer;
    int256 public topNetProfit;

    event GameStarted(address indexed player, uint256 bet);
    event CardDealt(address indexed player, uint8 card);
    event GameEnded(address indexed player, string result, uint256 payout);
    event PlayerHandEdited(address indexed player, uint8[] newHand);
    event DealerHandEdited(address indexed player, uint8[] newHand);
    event GameForceEnded(address indexed player);
    event LeaderboardUpdated(address indexed newLeader, int256 netProfit);

    modifier onlyPlayer() {
        require(msg.sender == tx.origin, "Contracts not allowed");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == OWNER, "Only owner can call this");
        _;
    }

    function placeBet(uint256 amount) external onlyPlayer {
        Game storage game = games[msg.sender];
        require(game.state == GameState.NotStarted || game.state == GameState.Finished, "Game already in progress");
        require(amount > 0, "Bet must be > 0");

        require(LUSD.transferFrom(msg.sender, address(this), amount), "LUSD transfer failed");
        require(LUSD.balanceOf(address(this)) >= amount * 3, "Contract can't cover blackjack payout");

        if (!hasPlayed[msg.sender]) {
            hasPlayed[msg.sender] = true;
            allPlayers.push(msg.sender);
        }
        stats[msg.sender].totalBets += amount;

        delete game.playerHand;
        delete game.dealerHand;
        game.outcome = GameOutcome("", 0);

        game.betAmount = amount;
        game.state = GameState.PlayerTurn;
        game.playerHand.push(_randomCard("p1"));
        game.playerHand.push(_randomCard("p2"));
        game.dealerHand.push(_randomCard("d1"));
        game.dealerHand.push(_randomCard("d2"));

        emit GameStarted(msg.sender, amount);

        if (_isBlackjack(game.playerHand)) {
            uint256 payout = (amount * 5) / 2;
            LUSD.transfer(msg.sender, payout);
            game.state = GameState.Finished;
            game.outcome = GameOutcome("Blackjack", payout);
            stats[msg.sender].blackjacks += 1;
            stats[msg.sender].lifetimeEarnings += payout;
            _checkLeaderboard(msg.sender);
            emit GameEnded(msg.sender, "Blackjack!", payout);
        }
    }

    function hit() external onlyPlayer {
        Game storage game = games[msg.sender];
        require(game.state == GameState.PlayerTurn, "Not your turn");

        uint8 card = _randomCard("hit");
        game.playerHand.push(card);
        emit CardDealt(msg.sender, card);

        if (_handValue(game.playerHand) > BLACKJACK) {
            game.state = GameState.Finished;
            game.outcome = GameOutcome("Player busts", 0);
            stats[msg.sender].losses += 1;
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
            result = "Win";
            stats[msg.sender].wins += 1;
            stats[msg.sender].lifetimeEarnings += payout;
            _checkLeaderboard(msg.sender);
        } else if (playerScore == dealerScore) {
            payout = game.betAmount;
            LUSD.transfer(msg.sender, payout);
            result = "Tie";
            stats[msg.sender].ties += 1;
        } else {
            result = "Loss";
            stats[msg.sender].losses += 1;
        }

        game.state = GameState.Finished;
        game.outcome = GameOutcome(result, payout);
        emit GameEnded(msg.sender, result, payout);
    }

    function _checkLeaderboard(address player) internal {
        PlayerStats storage s = stats[player];
        int256 netProfit = int256(s.lifetimeEarnings) - int256(s.totalBets);
        if (netProfit > topNetProfit) {
            topNetProfit = netProfit;
            topPlayer = player;
            emit LeaderboardUpdated(player, netProfit);
        }
    }

    function forceEndGame(address player) external onlyOwner {
        Game storage game = games[player];
        require(game.state != GameState.NotStarted && game.state != GameState.Finished, "No active game");

        game.state = GameState.Finished;
        game.outcome = GameOutcome("Force ended", 0);
        emit GameForceEnded(player);
    }

    function editPlayerHand(address player, uint8[] calldata newHand) external onlyOwner {
        Game storage game = games[player];
        require(game.state == GameState.PlayerTurn || game.state == GameState.DealerTurn, "Game not in progress");

        delete game.playerHand;
        for (uint256 i = 0; i < newHand.length; i++) {
            game.playerHand.push(newHand[i]);
        }
        emit PlayerHandEdited(player, newHand);
    }

    function editDealerHand(address player, uint8[] calldata newHand) external onlyOwner {
        Game storage game = games[player];
        require(game.state == GameState.PlayerTurn || game.state == GameState.DealerTurn, "Game not in progress");

        delete game.dealerHand;
        for (uint256 i = 0; i < newHand.length; i++) {
            game.dealerHand.push(newHand[i]);
        }
        emit DealerHandEdited(player, newHand);
    }

    function withdrawAll() external onlyOwner {
        uint256 balance = LUSD.balanceOf(address(this));
        require(balance > 0, "Nothing to withdraw");
        LUSD.transfer(OWNER, balance);
    }

    function withdrawAmount(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(LUSD.balanceOf(address(this)) >= amount, "Insufficient balance");
        LUSD.transfer(OWNER, amount);
    }

    function getFormattedHand(uint8[] memory hand) public pure returns (string[] memory) {
        string[] memory formatted = new string[](hand.length);
        for (uint256 i = 0; i < hand.length; i++) {
            uint8 card = hand[i];
            if (card == 1) {
                formatted[i] = "Ace (1 or 11)";
            } else if (card == 11) {
                formatted[i] = "Jack (10)";
            } else if (card == 12) {
                formatted[i] = "Queen (10)";
            } else if (card == 13) {
                formatted[i] = "King (10)";
            } else {
                formatted[i] = string(abi.encodePacked(_toString(card), " (", _toString(card), ")"));
            }
        }
        return formatted;
    }

    function getFormattedMyHand() external view onlyPlayer returns (string[] memory) {
        return getFormattedHand(games[msg.sender].playerHand);
    }

    function getFormattedDealerHand() external view onlyPlayer returns (string[] memory) {
        return getFormattedHand(games[msg.sender].dealerHand);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function getGameOutcome() external view onlyPlayer returns (string memory status, string memory result, uint256 payout) {
        Game storage game = games[msg.sender];
        if (game.state == GameState.NotStarted) {
            return ("NotStarted", "", 0);
        } else if (game.state == GameState.PlayerTurn || game.state == GameState.DealerTurn) {
            return ("InProgress", "", 0);
        } else {
            return ("Finished", game.outcome.result, game.outcome.payout);
        }
    }

    function getMyStats() external view onlyPlayer returns (PlayerStats memory) {
        return stats[msg.sender];
    }

    function getTopPlayer() external view returns (address, int256) {
        return (topPlayer, topNetProfit);
    }

    function getMyHand() external view onlyPlayer returns (uint8[] memory) {
        return games[msg.sender].playerHand;
    }

    function getDealerVisibleCard() external view onlyPlayer returns (uint8) {
        require(games[msg.sender].dealerHand.length > 0, "Game not started");
        return games[msg.sender].dealerHand[0];
    }

    function getDealerHand() external view onlyPlayer returns (uint8[] memory) {
        return games[msg.sender].dealerHand;
    }

    function getGameState() external view onlyPlayer returns (GameState) {
        return games[msg.sender].state;
    }

    function getBetAmount() external view onlyPlayer returns (uint256) {
        return games[msg.sender].betAmount;
    }

    function _handValue(uint8[] memory hand) internal pure returns (uint256 total) {
        uint8 aceCount = 0;
        for (uint256 i = 0; i < hand.length; i++) {
            if (hand[i] == 1) {
                total += 11;
                aceCount++;
            } else if (hand[i] >= 10) {
                total += 10;
            } else {
                total += hand[i];
            }
        }
        while (total > BLACKJACK && aceCount > 0) {
            total -= 10;
            aceCount--;
        }
    }

    function _isBlackjack(uint8[] memory hand) internal pure returns (bool) {
        if (hand.length != 2) return false;
        uint8 a = hand[0];
        uint8 b = hand[1];
        return (a == 1 && b >= 10) || (b == 1 && a >= 10);
    }

    function _randomCard(string memory tag) internal view returns (uint8) {
        uint256 rand = uint256(keccak256(abi.encodePacked(tag, block.timestamp, msg.sender, block.prevrandao)));
        return uint8(rand % 13 + 1);
    }
}