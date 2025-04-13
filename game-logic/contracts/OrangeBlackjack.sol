// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Stats contract with improved leaderboard functionality
contract BlackjackStats {
    address public owner;
    address public gameContract;
    
    uint8 constant MAX_NAME_LENGTH = 32;
    uint8 constant LEADERBOARD_SIZE = 5;
    
    struct PlayerStats {
        uint256 wins;
        uint256 losses;
        uint256 ties;
        uint256 blackjacks;
        uint256 earnings;
        uint256 bets;
        uint256 biggestWin;
        uint256 streak;
        uint256 longestStreak;
        uint256 gamesPlayed;
        string name;
    }
    
    struct LeaderboardEntry {
        address player;
        int256 netProfit;
        string name;
    }
    
    mapping(address => PlayerStats) public stats;
    address[] public allPlayers;
    LeaderboardEntry[LEADERBOARD_SIZE] public topPlayers;
    
    event NameSet(address indexed player, string name);
    event LeaderboardUpdated(address indexed player, int256 netProfit, uint8 position);
    event BigWin(address indexed player, uint256 amount);
    event LongStreak(address indexed player, uint256 streak);
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier onlyGame() {
        require(msg.sender == gameContract);
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function setGameContract(address _gameContract) external onlyOwner {
        require(gameContract == address(0));
        gameContract = _gameContract;
    }
    
    function setName(string calldata name) external {
        require(bytes(name).length > 0);
        require(bytes(name).length <= MAX_NAME_LENGTH);
        
        stats[msg.sender].name = name;
        
        // Update the leaderboard if player is on it
        for (uint8 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (topPlayers[i].player == msg.sender) {
                topPlayers[i].name = name;
                break;
            }
        }
        
        // Also update leaderboard in case this player should be on it
        _checkLeaderboard(msg.sender);
        
        emit NameSet(msg.sender, name);
    }
    
    function addPlayer(address player) external onlyGame {
        // Check if player is already in the list
        for (uint256 i = 0; i < allPlayers.length; i++) {
            if (allPlayers[i] == player) {
                return; // Player already exists
            }
        }
        allPlayers.push(player);
    }
    
    function incrementBet(address player, uint256 amount) external onlyGame {
        stats[player].bets += amount;
        stats[player].gamesPlayed += 1;
        
        // Update leaderboard after placing bet
        _checkLeaderboard(player);
    }
    
    function recordWin(address player, uint256 payout) external onlyGame {
        PlayerStats storage ps = stats[player];
        ps.wins += 1;
        ps.earnings += payout;
        ps.streak += 1;
        
        if (payout > ps.biggestWin) {
            ps.biggestWin = payout;
            emit BigWin(player, payout);
        }
        
        if (ps.streak > ps.longestStreak) {
            ps.longestStreak = ps.streak;
            emit LongStreak(player, ps.longestStreak);
        }
        
        // Update leaderboard after win
        _checkLeaderboard(player);
    }
    
    function recordLoss(address player) external onlyGame {
        stats[player].losses += 1;
        stats[player].streak = 0;
        
        // Important: Also update leaderboard after a loss
        _checkLeaderboard(player);
    }
    
    function recordTie(address player, uint256 payout) external onlyGame {
        stats[player].ties += 1;
        stats[player].streak = 0;
        stats[player].earnings += payout;
        
        // Update leaderboard after tie
        _checkLeaderboard(player);
    }
    
    function recordBlackjack(address player, uint256 payout) external onlyGame {
        PlayerStats storage ps = stats[player];
        ps.blackjacks += 1;
        ps.wins += 1;
        ps.earnings += payout;
        ps.streak += 1;
        
        if (payout > ps.biggestWin) {
            ps.biggestWin = payout;
            emit BigWin(player, payout);
        }
        
        if (ps.streak > ps.longestStreak) {
            ps.longestStreak = ps.streak;
            emit LongStreak(player, ps.longestStreak);
        }
        
        // Update leaderboard after blackjack
        _checkLeaderboard(player);
    }
    
    // Improved leaderboard function to prevent duplicates
    function _checkLeaderboard(address player) internal {
        PlayerStats storage s = stats[player];
        int256 netProfit = int256(s.earnings) - int256(s.bets);
        
        // First, check if player is already on the leaderboard and remove them
        int8 oldPosition = -1;
        for (uint8 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (topPlayers[i].player == player) {
                oldPosition = int8(i);
                break;
            }
        }
        
        // If player was found, remove them by shifting everyone up
        if (oldPosition >= 0) {
            for (uint8 i = uint8(oldPosition); i < LEADERBOARD_SIZE - 1; i++) {
                topPlayers[i] = topPlayers[i+1];
            }
            // Clear the last position
            topPlayers[LEADERBOARD_SIZE - 1] = LeaderboardEntry(address(0), 0, "");
        }
        
        // Now find the new position for the player based on net profit
        uint8 newPosition = LEADERBOARD_SIZE;
        for (uint8 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (topPlayers[i].player == address(0) || netProfit > topPlayers[i].netProfit) {
                newPosition = i;
                break;
            }
        }
        
        // If player should be on the leaderboard
        if (newPosition < LEADERBOARD_SIZE) {
            // Shift lower rankings down
            for (uint8 i = LEADERBOARD_SIZE - 1; i > newPosition; i--) {
                topPlayers[i] = topPlayers[i-1];
            }
            
            // Insert player at new position
            topPlayers[newPosition] = LeaderboardEntry(player, netProfit, s.name);
            emit LeaderboardUpdated(player, netProfit, newPosition);
        }
    }
    
    function updateLeaderboard(address player) external {
        // Allow the owner or game contract to force update the leaderboard
        require(msg.sender == owner || msg.sender == gameContract, "Not authorized");
        _checkLeaderboard(player);
    }
    
    // Get a player's stats
    function getStats(address player) external view returns (PlayerStats memory) {
        return stats[player];
    }
    
    // Get the current top players
    function getTopPlayers() external view returns (LeaderboardEntry[LEADERBOARD_SIZE] memory) {
        return topPlayers;
    }
    
    // Get a player's name
    function getPlayerName(address player) external view returns (string memory) {
        return stats[player].name;
    }
    
    // Get all player addresses (for admin use)
    function getAllPlayers() external view onlyOwner returns (address[] memory) {
        return allPlayers;
    }
    
    // Calculate and return a player's net profit
    function getNetProfit(address player) external view returns (int256) {
        PlayerStats storage s = stats[player];
        return int256(s.earnings) - int256(s.bets);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IBlackjackStats {
    function addPlayer(address player) external;
    function incrementBet(address player, uint256 amount) external;
    function recordWin(address player, uint256 payout) external;
    function recordLoss(address player) external;
    function recordTie(address player, uint256 payout) external;
    function recordBlackjack(address player, uint256 payout) external;
    function updateLeaderboard(address player) external;
}

contract OrangeBlackjack {
    IERC20 public constant LUSD = IERC20(0x9142FA65aAEf921Aea2127e88758adeE0510a0F0);
    address public constant OWNER = 0x29821A88A2CB149B8519d38226F9A8c58Ab6cDA3;
    address public statsContract;

    enum GState { NotStarted, PlayerTurn, DealerTurn, Finished }

    struct Game {
        GState state;
        uint256 bet;
        uint8[] playerHand;
        uint8[] dealerHand;
        string result;
        uint256 payout;
    }

    mapping(address => Game) public games;
    mapping(address => bool) internal hasPlayed;

    uint8 constant BLACKJACK = 21;
    uint8 constant DEALER_STAND = 17;

    event GameStarted(address indexed player, uint256 bet);
    event CardDealt(address indexed player, uint8 card);
    event GameEnded(address indexed player, string result, uint256 payout);
    event HandEdited(address indexed player, bool isPlayer, uint8[] newHand);
    event GameForceEnded(address indexed player);

    modifier onlyPlayer() {
        require(msg.sender == tx.origin, "Contracts not allowed");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == OWNER, "Not owner");
        _;
    }

    // Set the stats contract address - can only be done once
    function setStatsContract(address _statsContract) external onlyOwner {
        require(statsContract == address(0), "Already set");
        statsContract = _statsContract;
    }

    function placeBet(uint256 amount) external onlyPlayer {
        Game storage game = games[msg.sender];
        require(game.state == GState.NotStarted || game.state == GState.Finished, "Game in progress");
        require(amount > 0, "Bet must be > 0");

        require(LUSD.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        require(LUSD.balanceOf(address(this)) >= amount * 3, "Insufficient house funds");

        if (statsContract != address(0)) {
            if (!hasPlayed[msg.sender]) {
                hasPlayed[msg.sender] = true;
                IBlackjackStats(statsContract).addPlayer(msg.sender);
            }
            
            IBlackjackStats(statsContract).incrementBet(msg.sender, amount);
        }

        delete game.playerHand;
        delete game.dealerHand;
        game.result = "";
        game.payout = 0;

        game.bet = amount;
        game.state = GState.PlayerTurn;
        game.playerHand.push(_randomCard("p1"));
        game.playerHand.push(_randomCard("p2"));
        game.dealerHand.push(_randomCard("d1"));
        game.dealerHand.push(_randomCard("d2"));

        emit GameStarted(msg.sender, amount);

        if (_isBlackjack(game.playerHand)) {
            _handleBlackjack(game);
        }
    }

    function _handleBlackjack(Game storage game) private {
        uint256 payout = (game.bet * 5) / 2;
        LUSD.transfer(msg.sender, payout);
        game.state = GState.Finished;
        game.result = "Blackjack";
        game.payout = payout;
        
        if (statsContract != address(0)) {
            IBlackjackStats(statsContract).recordBlackjack(msg.sender, payout);
        }
        
        emit GameEnded(msg.sender, "Blackjack!", payout);
    }

    function hit() external onlyPlayer {
        Game storage game = games[msg.sender];
        require(game.state == GState.PlayerTurn, "Not your turn");

        uint8 card = _randomCard("hit");
        game.playerHand.push(card);
        emit CardDealt(msg.sender, card);

        if (_handValue(game.playerHand) > BLACKJACK) {
            game.state = GState.Finished;
            game.result = "Bust";
            game.payout = 0;
            
            if (statsContract != address(0)) {
                IBlackjackStats(statsContract).recordLoss(msg.sender);
                // Force update leaderboard after loss
                IBlackjackStats(statsContract).updateLeaderboard(msg.sender);
            }
            
            emit GameEnded(msg.sender, "Player busts", 0);
        }
    }

    function stand() external onlyPlayer {
        Game storage game = games[msg.sender];
        require(game.state == GState.PlayerTurn, "Not your turn");

        game.state = GState.DealerTurn;

        while (_handValue(game.dealerHand) < DEALER_STAND) {
            game.dealerHand.push(_randomCard("deal"));
        }

        uint256 playerScore = _handValue(game.playerHand);
        uint256 dealerScore = _handValue(game.dealerHand);
        uint256 payout = 0;
        string memory result;

        if (dealerScore > BLACKJACK || playerScore > dealerScore) {
            payout = game.bet * 2;
            LUSD.transfer(msg.sender, payout);
            result = "Win";
            
            if (statsContract != address(0)) {
                IBlackjackStats(statsContract).recordWin(msg.sender, payout);
            }
        } else if (playerScore == dealerScore) {
            payout = game.bet;
            LUSD.transfer(msg.sender, payout);
            result = "Tie";
            
            if (statsContract != address(0)) {
                IBlackjackStats(statsContract).recordTie(msg.sender, payout);
            }
        } else {
            result = "Loss";
            
            if (statsContract != address(0)) {
                IBlackjackStats(statsContract).recordLoss(msg.sender);
                // Force update leaderboard after loss
                IBlackjackStats(statsContract).updateLeaderboard(msg.sender);
            }
        }

        game.state = GState.Finished;
        game.result = result;
        game.payout = payout;
        emit GameEnded(msg.sender, result, payout);
    }

    function forceEndGame(address player) external onlyOwner {
        Game storage game = games[player];
        require(game.state != GState.NotStarted && game.state != GState.Finished, "No active game");

        game.state = GState.Finished;
        game.result = "Forced";
        game.payout = 0;
        
        // Force update leaderboard when game is forced to end
        if (statsContract != address(0)) {
            IBlackjackStats(statsContract).updateLeaderboard(player);
        }
        
        emit GameForceEnded(player);
    }

    function editHand(address player, bool isPlayer, uint8[] calldata newHand) external onlyOwner {
        Game storage game = games[player];
        require(game.state == GState.PlayerTurn || game.state == GState.DealerTurn, "Game not in progress");

        if (isPlayer) {
            delete game.playerHand;
            for (uint i = 0; i < newHand.length; i++) {
                game.playerHand.push(newHand[i]);
            }
        } else {
            delete game.dealerHand;
            for (uint i = 0; i < newHand.length; i++) {
                game.dealerHand.push(newHand[i]);
            }
        }
        emit HandEdited(player, isPlayer, newHand);
    }

    function withdraw(uint256 amount) external onlyOwner {
        if (amount == 0) {
            amount = LUSD.balanceOf(address(this));
        }
        require(amount > 0, "Nothing to withdraw");
        require(LUSD.balanceOf(address(this)) >= amount, "Insufficient balance");
        LUSD.transfer(OWNER, amount);
    }

    function getGameState(address player) external view returns (
        GState state, 
        uint256 bet, 
        uint8[] memory pHand, 
        uint8[] memory dHand, 
        string memory result, 
        uint256 payout
    ) {
        Game storage game = games[player];
        return (game.state, game.bet, game.playerHand, game.dealerHand, game.result, game.payout);
    }

    function _handValue(uint8[] memory hand) internal pure returns (uint256 total) {
        uint8 aceCount = 0;
        for (uint i = 0; i < hand.length; i++) {
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