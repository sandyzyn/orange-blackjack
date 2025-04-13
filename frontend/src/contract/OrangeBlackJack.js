export const GAME_CONTRACT_ADDRESS = "0x9Cd80Cc680204Eb6b77602D0Db9E9BF982895F00"; // Address of your game contract
export const STATS_CONTRACT_ADDRESS = "0x435951B12825cFDCaE394fcC2494A522D9A7011D"; // Address of your stats contract
export const GAME_CONTRACT_ABI = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"uint8","name":"card","type":"uint8"}],"name":"CardDealt","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"string","name":"result","type":"string"},{"indexed":false,"internalType":"uint256","name":"payout","type":"uint256"}],"name":"GameEnded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"}],"name":"GameForceEnded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"uint256","name":"bet","type":"uint256"}],"name":"GameStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"bool","name":"isPlayer","type":"bool"},{"indexed":false,"internalType":"uint8[]","name":"newHand","type":"uint8[]"}],"name":"HandEdited","type":"event"},{"inputs":[],"name":"LUSD","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"OWNER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"bool","name":"isPlayer","type":"bool"},{"internalType":"uint8[]","name":"newHand","type":"uint8[]"}],"name":"editHand","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"forceEndGame","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"games","outputs":[{"internalType":"enum OrangeBlackjack.GState","name":"state","type":"uint8"},{"internalType":"uint256","name":"bet","type":"uint256"},{"internalType":"string","name":"result","type":"string"},{"internalType":"uint256","name":"payout","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"getGameState","outputs":[{"internalType":"enum OrangeBlackjack.GState","name":"state","type":"uint8"},{"internalType":"uint256","name":"bet","type":"uint256"},{"internalType":"uint8[]","name":"pHand","type":"uint8[]"},{"internalType":"uint8[]","name":"dHand","type":"uint8[]"},{"internalType":"string","name":"result","type":"string"},{"internalType":"uint256","name":"payout","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"hit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"placeBet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_statsContract","type":"address"}],"name":"setStatsContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"stand","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"statsContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];
export const STATS_CONTRACT_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BigWin","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"int256","name":"netProfit","type":"int256"},{"indexed":false,"internalType":"uint8","name":"position","type":"uint8"}],"name":"LeaderboardUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"uint256","name":"streak","type":"uint256"}],"name":"LongStreak","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"string","name":"name","type":"string"}],"name":"NameSet","type":"event"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"addPlayer","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPlayers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"gameContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllPlayers","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"getNetProfit","outputs":[{"internalType":"int256","name":"","type":"int256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"getPlayerName","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"getStats","outputs":[{"components":[{"internalType":"uint256","name":"wins","type":"uint256"},{"internalType":"uint256","name":"losses","type":"uint256"},{"internalType":"uint256","name":"ties","type":"uint256"},{"internalType":"uint256","name":"blackjacks","type":"uint256"},{"internalType":"uint256","name":"earnings","type":"uint256"},{"internalType":"uint256","name":"bets","type":"uint256"},{"internalType":"uint256","name":"biggestWin","type":"uint256"},{"internalType":"uint256","name":"streak","type":"uint256"},{"internalType":"uint256","name":"longestStreak","type":"uint256"},{"internalType":"uint256","name":"gamesPlayed","type":"uint256"},{"internalType":"string","name":"name","type":"string"}],"internalType":"struct BlackjackStats.PlayerStats","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTopPlayers","outputs":[{"components":[{"internalType":"address","name":"player","type":"address"},{"internalType":"int256","name":"netProfit","type":"int256"},{"internalType":"string","name":"name","type":"string"}],"internalType":"struct BlackjackStats.LeaderboardEntry[5]","name":"","type":"tuple[5]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"incrementBet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"payout","type":"uint256"}],"name":"recordBlackjack","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"recordLoss","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"payout","type":"uint256"}],"name":"recordTie","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"payout","type":"uint256"}],"name":"recordWin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_gameContract","type":"address"}],"name":"setGameContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"}],"name":"setName","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stats","outputs":[{"internalType":"uint256","name":"wins","type":"uint256"},{"internalType":"uint256","name":"losses","type":"uint256"},{"internalType":"uint256","name":"ties","type":"uint256"},{"internalType":"uint256","name":"blackjacks","type":"uint256"},{"internalType":"uint256","name":"earnings","type":"uint256"},{"internalType":"uint256","name":"bets","type":"uint256"},{"internalType":"uint256","name":"biggestWin","type":"uint256"},{"internalType":"uint256","name":"streak","type":"uint256"},{"internalType":"uint256","name":"longestStreak","type":"uint256"},{"internalType":"uint256","name":"gamesPlayed","type":"uint256"},{"internalType":"string","name":"name","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"topPlayers","outputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"int256","name":"netProfit","type":"int256"},{"internalType":"string","name":"name","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"updateLeaderboard","outputs":[],"stateMutability":"nonpayable","type":"function"}];